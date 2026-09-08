import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourses, useCourseSearch, useMyCoursesDashboard, useToggleWishlist } from "../../hooks";
import { COURSE_LEVELS, COURSE_PLATFORMS, getPlatformStyle } from "./courseDisplay";
import { DataGuard } from "../../components/LoadingAndError";
import { RecommendationsPanel } from "./RecommendationsPanel";
import "./courses.css";

// Real backend catalog (adapted-backend's /api/courses - scraped Coursera/
// Udemy/Skillshare content), replacing the old hardcoded demo catalog.
// There is no "linked learning module" concept here - the old catalog's
// moduleIds tied curated demo resources to Learning Path modules, which the
// real course marketplace has no equivalent for.
export function CoursesView() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [level, setLevel] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [page, setPage] = useState(1);

  // Phase B26: a search term now hits GET /courses/search (fuzzy/relevance-
  // ranked, AI-personalized when logged in) instead of the plain `title`
  // filter on GET /courses - debounced so typing doesn't fire a request per
  // keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const isSearching = Boolean(debouncedSearch);

  const filters = useMemo(() => {
    const f = { page, pageSize: 12 };
    if (level !== "All") f.level = level;
    if (platform !== "All") f.platform = platform;
    return f;
  }, [level, platform, page]);

  const searchParams = useMemo(() => {
    const p = { q: debouncedSearch, page, pageSize: 12 };
    if (level !== "All") p.level = level;
    if (platform !== "All") p.platform = platform;
    return p;
  }, [debouncedSearch, level, platform, page]);

  const listQuery = useCourses(filters, { enabled: !isSearching });
  const searchQuery = useCourseSearch(searchParams);
  const { courses, meta, loading, error, refetch } = isSearching ? searchQuery : listQuery;

  const dashboardQuery = useMyCoursesDashboard();
  const { execute: toggleWishlist } = useToggleWishlist();

  // Reset to page 1 whenever a filter (not the page itself) changes.
  useEffect(() => setPage(1), [debouncedSearch, level, platform]);

  const wishlistIds = useMemo(
    () => new Set((dashboardQuery.data?.wishlist || []).map((uc) => uc.courseId)),
    [dashboardQuery.data],
  );
  const statusByCourseId = useMemo(() => {
    const map = new Map();
    for (const uc of dashboardQuery.data?.continueLearning || []) map.set(uc.courseId, "in_progress");
    for (const uc of dashboardQuery.data?.completed || []) map.set(uc.courseId, "completed");
    return map;
  }, [dashboardQuery.data]);

  async function handleToggleWishlist(courseId, currentlyWishlisted) {
    try {
      await toggleWishlist({ courseId, isWishlist: !currentlyWishlisted });
      dashboardQuery.refetch();
    } catch {
      // Backend refuses wishlisting a course already enrolled/completed -
      // the button state just won't change, which is feedback enough here.
    }
  }

  function clearFilters() {
    setSearchInput(""); setLevel("All"); setPlatform("All");
  }

  return (
    <div className="courses-page">
      <section className="courses-hero fade-up">
        <div>
          <div className="courses-eyebrow">Course catalog</div>
          <h1>Find the right course for your next skill</h1>
          <p>Real courses from Coursera, Udemy, and Skillshare.</p>
        </div>
        {/* Always the whole-catalog count (listQuery), even while a search
            is active and `meta` below is showing search-result counts instead. */}
        <div className="courses-hero-stats"><span><b>{listQuery.meta.total}</b> courses available</span></div>
      </section>

      <RecommendationsPanel />

      <section className="courses-toolbar fade-up">
        <label className="courses-search">
          <span>⌕</span>
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search courses (try a skill, role, or topic)…" />
        </label>
        <div className="courses-filter-row">
          <select aria-label="Filter by level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {COURSE_LEVELS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Filter by platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {COURSE_PLATFORMS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </section>

      <div className="courses-results-heading">
        <span>
          {meta.total} course{meta.total === 1 ? "" : "s"} found
          {isSearching && meta.ai?.applied && " · ✨ personalized for you"}
        </span>
        {(searchInput || level !== "All" || platform !== "All") && (
          <button type="button" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      <DataGuard loading={loading} error={error} data={courses} onRetry={refetch}>
        {(courseList) => courseList.length ? (
          <>
            <section className="courses-grid">
              {courseList.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  wishlisted={wishlistIds.has(course.id)}
                  status={statusByCourseId.get(course.id) || "not_started"}
                  onToggleWishlist={() => handleToggleWishlist(course.id, wishlistIds.has(course.id))}
                />
              ))}
            </section>
            {meta.totalPages > 1 && (
              <nav className="courses-pagination" aria-label="Course pages">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
                <span>Page {meta.page} of {meta.totalPages}</span>
                <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
              </nav>
            )}
          </>
        ) : (
          <section className="courses-empty"><span>⌕</span><h2>No courses match these filters</h2><p>Try another search term or clear your filters.</p><button type="button" onClick={clearFilters}>Clear filters</button></section>
        )}
      </DataGuard>
    </div>
  );
}

export function CourseCard({ course, wishlisted, status, onToggleWishlist }) {
  const { mark, accent, label } = getPlatformStyle(course.platform);
  return (
    <article className="course-card" style={{ "--course-accent": accent }}>
      <div className="course-card-banner">
        <span>{mark}</span>
        <small>{label}</small>
        <button type="button" aria-label={`${wishlisted ? "Remove" : "Save"} ${course.title}`} className={wishlisted ? "is-saved" : ""} onClick={onToggleWishlist}>
          {wishlisted ? "♥" : "♡"}
        </button>
      </div>
      <div className="course-card-body">
        <div className="course-card-tags">
          <span>{course.level || "All levels"}</span>
          {course.certificationType && <span>{course.certificationType}</span>}
          {status !== "not_started" && <span className={`is-${status}`}>{status === "completed" ? "Completed" : "In progress"}</span>}
          {/* Only present on search results (GET /courses/search) - the AI's
              best-effort read of why this course matched, not shown for
              plain catalog browsing where it's never computed. */}
          {(course.aiTags || []).slice(0, 2).map((tag) => <span key={tag} className="is-ai-tag">✨ {tag}</span>)}
        </div>
        <h2>{course.title}</h2>
        <div className="course-card-details">
          {course.durationHours != null && <span>{course.durationHours}h</span>}
          {course.rating != null && <span>★ {course.rating}</span>}
          {course.enrolledCount != null && <span>{Intl.NumberFormat("en", { notation: "compact" }).format(course.enrolledCount)} enrolled</span>}
        </div>
        <div className="course-card-skills">{(course.skills || []).slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div>
        <Link to={`/courses/${course.id}`}>View course →</Link>
      </div>
    </article>
  );
}
