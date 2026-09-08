import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useCourse,
  useMyCoursesDashboard,
  useToggleWishlist,
  useEnrollCourse,
  useVerifyCourseEnrollment,
  usePresignCertificateUpload,
  useCompleteCourse,
  useCertificates,
} from "../../hooks";
import { DataGuard } from "../../components/LoadingAndError";
import { getInstructorNames, getPlatformStyle } from "./courseDisplay";
import "./courses.css";

// A 422 from validate() (middleware/validate.ts) always carries the generic
// "Validation failed" as err.message - the actual reason (e.g. "Only PDF,
// JPEG... are supported") is in err.data, an array of { field, message }.
// Prefer that first field's message so a rejected certificate upload says
// why, not just that something failed.
function describeApiError(err) {
  const detail = Array.isArray(err?.data) ? err.data[0]?.message : null;
  return detail || err.message;
}

// Real backend course (adapted-backend's /api/courses/:id), replacing the
// old hardcoded demo catalog lookup. No "linked learning-path module"
// section - the real course marketplace has no equivalent concept.
export function CourseDetailsPage() {
  const { courseId } = useParams();
  const { data: course, loading, error, refetch } = useCourse(courseId);
  const dashboardQuery = useMyCoursesDashboard();
  const { execute: toggleWishlist } = useToggleWishlist();
  const { execute: enroll, loading: enrolling } = useEnrollCourse();
  const { execute: verify, loading: verifying } = useVerifyCourseEnrollment();
  const { execute: presignUpload } = usePresignCertificateUpload();
  const { execute: completeCourse } = useCompleteCourse();
  const [actionError, setActionError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const certificatesQuery = useCertificates(courseId);
  // The dashboard endpoint only surfaces in_progress/wishlist/completed rows
  // - "pending_verification" (right after Enroll, before Verify) has no
  // server-exposed signal, so it's tracked locally for this session only.
  const [justEnrolled, setJustEnrolled] = useState(false);

  const dashboard = dashboardQuery.data || { continueLearning: [], wishlist: [], completed: [] };
  const wishlisted = dashboard.wishlist.some((uc) => uc.courseId === courseId);
  const status = dashboard.completed.some((uc) => uc.courseId === courseId)
    ? "completed"
    : dashboard.continueLearning.some((uc) => uc.courseId === courseId)
      ? "in_progress"
      : "not_started";

  async function handleAction(fn, onSuccess) {
    setActionError(null);
    try {
      await fn(courseId);
      dashboardQuery.refetch();
      onSuccess?.();
    } catch (err) {
      setActionError(describeApiError(err));
    }
  }

  // 1) ask the backend for a presigned S3 PUT url, 2) upload the file
  // directly to S3 (never through our own server), 3) tell the backend the
  // upload finished so it can mark the course completed and record the
  // certificate. Requires AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/
  // AWS_S3_BUCKET to be configured on the backend - without them, step 1
  // fails with a clear "AWS_S3_BUCKET is required"-style error below.
  async function handleCertificateFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setActionError(null);
    setUploading(true);
    try {
      const presigned = await presignUpload({ courseId, fileName: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size });

      const putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`);

      await completeCourse({
        courseId,
        data: { certificateKey: presigned.key, fileName: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size },
      });
      dashboardQuery.refetch();
      certificatesQuery.refetch();
    } catch (err) {
      setActionError(describeApiError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <DataGuard loading={loading} error={error} data={course} onRetry={refetch}>
      {(course) => {
        const { mark, accent, label } = getPlatformStyle(course.platform);
        const instructorNames = getInstructorNames(course.instructors);

        return (
          <div className="course-details-page fade-up">
            <nav className="courses-breadcrumb" aria-label="Breadcrumb">
              <Link to="/courses">Explore courses</Link><span>›</span><span>{course.title}</span>
            </nav>

            <section className="course-details-hero" style={{ "--course-accent": accent }}>
              <div className="course-details-mark">{mark}</div>
              <div className="course-details-copy">
                <div className="course-card-tags">
                  <span>{label}</span>
                  <span>{course.level || "All levels"}</span>
                  {course.certificationType && <span>{course.certificationType}</span>}
                </div>
                <h1>{course.title}</h1>
                {instructorNames && <p>Taught by {instructorNames}</p>}
                <div>
                  {course.durationHours != null && <span>{course.durationHours} hours</span>}
                  {course.rating != null && <span>★ {course.rating}</span>}
                  {course.enrolledCount != null && <span>{Intl.NumberFormat("en", { notation: "compact" }).format(course.enrolledCount)} enrolled</span>}
                </div>
              </div>
              <button type="button" className={wishlisted ? "is-saved" : ""} onClick={() => handleAction((id) => toggleWishlist({ courseId: id, isWishlist: !wishlisted }))}>
                {wishlisted ? "♥ Saved" : "♡ Save course"}
              </button>
            </section>

            {actionError && (
              <p style={{ color: "#B91C1C", fontSize: 13, marginTop: -8, marginBottom: 16 }}>{actionError}</p>
            )}

            <div className="course-details-layout">
              <section className="course-details-main">
                {(course.learningOutcomes || []).length > 0 && (
                  <article className="course-detail-card">
                    <span>01</span><h2>What you will learn</h2>
                    <ul>{course.learningOutcomes.map((outcome) => <li key={outcome}><b>✓</b>{outcome}</li>)}</ul>
                  </article>
                )}
              </section>

              <aside className="course-action-card">
                <small>Course status</small>
                <strong>{status === "not_started" ? "Not started" : status === "in_progress" ? "In progress" : "Completed"}</strong>

                {status === "not_started" && !justEnrolled && (
                  <button type="button" disabled={enrolling} onClick={() => handleAction(enroll, () => setJustEnrolled(true))}>
                    {enrolling ? "Enrolling…" : "Enroll"}
                  </button>
                )}
                {status === "not_started" && justEnrolled && (
                  <button type="button" disabled={verifying} onClick={() => handleAction(verify, () => setJustEnrolled(false))}>
                    {verifying ? "Verifying…" : "Verify purchase"}
                  </button>
                )}
                {status === "in_progress" && (
                  <>
                    <p style={{ fontSize: 12.5, color: "#64748B", marginBottom: 8 }}>
                      Upload your completion certificate to mark this course done.
                    </p>
                    <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/gif,image/webp" style={{ display: "none" }} onChange={handleCertificateFile} />
                    <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      {uploading ? "Uploading…" : "Upload certificate"}
                    </button>
                  </>
                )}
                {status === "completed" && (certificatesQuery.data || [])[0]?.downloadUrl && (
                  <a href={certificatesQuery.data[0].downloadUrl} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                    🎓 View your certificate →
                  </a>
                )}

                <a href={course.deepLink} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, fontSize: 13, fontWeight: 600 }}>
                  Go to course on {label} →
                </a>

                <hr />
                <h3>Skills included</h3>
                <div>{(course.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
              </aside>
            </div>
          </div>
        );
      }}
    </DataGuard>
  );
}
