const puppeteer = require('puppeteer');
const BaseProvider = require('./baseProvider');
const pLimit = require('p-limit');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const COURSE_LINK_SELECTOR = [
  'a[href^="/learn/"]',
  'a[href^="/specializations/"]',
  'a[href^="/professional-certificates/"]',
  'a[href^="/guided-projects/"]',
  'a[href^="https://www.coursera.org/learn/"]',
  'a[href^="https://www.coursera.org/specializations/"]',
  'a[href^="https://www.coursera.org/professional-certificates/"]',
  'a[href^="https://www.coursera.org/guided-projects/"]'
].join(',');

const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const createCourseraError = (message, cause) => {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = 'CourseraScraperError';
  error.code = 'COURSERA_SCRAPE_FAILED';
  return error;
};

// Scraper for Coursera search + course details + reviews
// Uses puppeteer with a simple "one page per job" strategy (no pooling yet)
// - fetchList: search page -> returns light-weight card data (each card = course)
// - fetchDetails: course page -> returns full detail, including reviews
class CourseraProvider extends BaseProvider {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://www.coursera.org';
    this.searchPath = '/search';
    this.defaultDelayMs = options.defaultDelayMs || 1000; // small think time
    this.browser = null;
    this.pagePool = [];
    this.maxPages = options.maxPages || 6;

    // Scraper reliability fix: Coursera is a JavaScript-heavy external site, so use
    // configurable timeouts and retries instead of a fixed 15-second one-shot wait.
    this.navigationTimeoutMs = positiveInteger(
      options.navigationTimeoutMs || process.env.SCRAPER_NAVIGATION_TIMEOUT_MS,
      45_000
    );
    this.resultsTimeoutMs = positiveInteger(
      options.resultsTimeoutMs || process.env.SCRAPER_RESULTS_TIMEOUT_MS,
      45_000
    );
    this.maxRetries = positiveInteger(
      options.maxRetries || process.env.SCRAPER_MAX_RETRIES,
      3
    );
  }

  // Internal: new browser instance
  async _launch() {
    if (!this.browser) {
      console.log('Launching browser...');

      // Scraper reliability fix: allow deployments to select a managed Chrome binary.
      // If omitted, Puppeteer continues to use its bundled browser.
      const executablePath = this.options.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH;
      this.browser = await puppeteer.launch({
        headless: 'new',
        ...(executablePath ? { executablePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }
  }

  // Internal: wait a bit between actions to be "polite"
  async _idle(page, ms = this.defaultDelayMs) {
    await sleep(ms);
  }

  async _acquirePage() {
    if (!this.browser) throw new Error('Browser not initialized');
    const page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(this.navigationTimeoutMs);
    page.setDefaultTimeout(this.resultsTimeoutMs);
    await page.setViewport({ width: 1365, height: 900 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Scraper reliability fix: use a normal browser identity. Some external sites serve
    // incomplete placeholder pages to the default headless automation fingerprint.
    await page.setUserAgent(
      process.env.SCRAPER_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    return page;
  }

  async _getPageDiagnostics(page) {
    return page.evaluate((selector) => ({
      url: window.location.href,
      title: document.title,
      courseLinkCount: document.querySelectorAll(selector).length,
      bodyPreview: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240)
    }), COURSE_LINK_SELECTOR).catch(() => ({
      url: page.url(),
      title: null,
      courseLinkCount: 0,
      bodyPreview: null
    }));
  }

  async _waitForCourseLinks(page) {
    // Scraper reliability fix: direct DOM polling is more dependable here than
    // waitForFunction's isolated execution world on frequently re-rendered React pages.
    const deadline = Date.now() + this.resultsTimeoutMs;

    while (Date.now() < deadline) {
      const count = await page
        .$$eval(COURSE_LINK_SELECTOR, links => links.length)
        .catch(() => 0);

      if (count > 0) return count;
      await sleep(750);
    }

    const diagnostics = await this._getPageDiagnostics(page);
    const error = new Error(
      `Timed out waiting for Coursera results at ${diagnostics.url}; ` +
      `title="${diagnostics.title || 'unknown'}"; preview="${diagnostics.bodyPreview || 'empty'}"`
    );
    error.diagnostics = diagnostics;
    throw error;
  }

  async _releasePage(page) {
    if (!page) return;
    await page.close().catch(() => { });
  }


  // Internal: close browser instance
  async _close() {
    if (this.browser) {
      console.log('Closing browser...');
      await this.browser.close();
      this.browser = null;
    }
  }

  _guessTypeFromPath(path) {
    if (!path) return null;
    if (path.startsWith('/learn/')) return 'Course';
    if (path.startsWith('/specializations/')) return 'Specialization';
    if (path.startsWith('/professional-certificates/')) return 'Professional Certificate';
    if (path.startsWith('/guided-projects/')) return 'Guided Project';
    return null;
  }

  async _fetchInstructorBio(instructorHrefOrUrl) {
    if (!instructorHrefOrUrl) return null;

    const bioPage = await this.browser.newPage();
    const url = instructorHrefOrUrl.startsWith('http')
      ? instructorHrefOrUrl
      : `${this.baseUrl}${instructorHrefOrUrl}`;

    try {
      await bioPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
      const bio = await bioPage.evaluate(() => {
        const bioEl = document.querySelector('h3[class*="bio-header"] + div')
        if (bioEl) {
          return (bioEl.textContent || '').replace(/\s+/g, ' ').trim();
        }
      });

      return bio;
    } catch (error) {
      return null;
    } finally {
      await bioPage.close().catch(() => []);
    }
  }


  async fetchList(opts = {}) {
    const { page = 1, pageSize = 20, query = '', filters = {} } = opts;

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    const pageCtx = await this._acquirePage();

    try {
      // Build Coursera search URL with optional filters (multi-valued level/topic)
      const params = new URLSearchParams();
      if (query) params.set('query', String(query));

      // level: Can be a string ("Advanced") or an array (["Intermediate", "Beginner"])
      // Acceptable values: Beginner, Intermediate, Advanced, Mixed
      if (filters.level) {
        const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
        levels.filter(Boolean).forEach((lvl) => {
          params.append('productDifficultyLevel', String(lvl));
        });
      }

      // topic: Can be a string or an array
      // Acceptable values: Computer Science, Data Science, Information Technology,
      //                    Business, Health, Physical Science and Engineering,
      //                    Math and Logic
      if (filters.topic) {
        const topics = Array.isArray(filters.topic) ? filters.topic : [filters.topic];
        topics.filter(Boolean).forEach((topic) => {
          params.append('topic', String(topic));
        });
      }

      // sort: Can only be a single value
      // Acceptable values: BEST_MATCH, NEWEST 
      if (filters.sort) params.set('sortBy', filters.sort); // BEST_MATCH, NEW, HIGHEST_RATING
      params.set('page', String(page));

      const url = `${this.baseUrl}${this.searchPath}?${params.toString()}`;

      // Scraper reliability fix: block only heavy media. Stylesheets and "other"
      // requests may participate in Coursera's client-side rendering and are preserved.
      await pageCtx.setRequestInterception(true);
      pageCtx.removeAllListeners('request');

      pageCtx.on('request', req => {
        const type = req.resourceType();
        if (['image', 'font', 'media'].includes(type)) return req.abort();
        req.continue();
      });

      let courseData = [];
      let lastError = null;

      for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
        try {
          await pageCtx.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: this.navigationTimeoutMs
          });

          // Handle common cookie banners (best-effort, ignore errors).
          try {
            const oneTrust = await pageCtx.$('#onetrust-accept-btn-handler');
            if (oneTrust) await oneTrust.click();

            await pageCtx.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
              const accept = buttons.find(button => /accept.*cookies/i.test(button.textContent || ''));
              if (accept) accept.click();
            });
          } catch { }

          await this._waitForCourseLinks(pageCtx);

          // Scraper reliability fix: Coursera currently mixes relative course URLs,
          // absolute course URLs, and modal search URLs. Only direct course URLs are
          // valid external IDs; saving a modal URL would make detail scraping revisit
          // the search page instead of the selected course.
          courseData = await pageCtx.evaluate(() => {
            const directLinkSelector = [
              'a[href^="/learn/"]',
              'a[href^="/specializations/"]',
              'a[href^="/professional-certificates/"]',
              'a[href^="/guided-projects/"]',
              'a[href^="https://www.coursera.org/learn/"]',
              'a[href^="https://www.coursera.org/specializations/"]',
              'a[href^="https://www.coursera.org/professional-certificates/"]',
              'a[href^="https://www.coursera.org/guided-projects/"]'
            ].join(',');
            const primaryCards = Array.from(document.querySelectorAll('div[aria-label="Search Results"] ul > li'));
            const cardsWithDirectLinks = primaryCards.filter(card => card.querySelector(directLinkSelector));
            const roots = cardsWithDirectLinks.length
              ? cardsWithDirectLinks
              : Array.from(document.querySelectorAll(directLinkSelector));
            const seen = new Set();

            return roots.map(root => {
              try {
                const link = root.matches?.(directLinkSelector) ? root : root.querySelector(directLinkSelector);
                const href = link?.getAttribute('href') || null;
                if (!href) return null;

                const courseUrl = new URL(href, 'https://www.coursera.org');
                const externalId = courseUrl.pathname.replace(/\/$/, '');
                if (!externalId || seen.has(externalId)) return null;

                const titleNode = link.querySelector('h3') || root.querySelector('h3');
                const title = (titleNode?.textContent || link.getAttribute('aria-label') || link.textContent || '')
                  .replace(/\s+/g, ' ')
                  .trim();
                if (!title) return null;

                const ratingEl = root.querySelector?.('div[aria-roledescription*="rating"], [aria-label*="rating" i]');
                const ratingText = ratingEl?.getAttribute('aria-valuenow') || ratingEl?.textContent || '';
                const ratingMatch = String(ratingText).match(/\d+(?:\.\d+)?/);
                const imageEl = root.querySelector?.('img');

                seen.add(externalId);
                return {
                  externalId,
                  deepLink: `${courseUrl.origin}${externalId}`,
                  title,
                  imageUrl: imageEl?.getAttribute('src') || null,
                  rating: ratingMatch ? Number(ratingMatch[0]) : null
                };
              } catch (error) {
                return null;
              }
            }).filter(Boolean);
          });

          if (!courseData.length) {
            throw new Error('Coursera rendered no extractable course cards');
          }

          break;
        } catch (error) {
          lastError = error;
          console.warn(`[CourseraProvider] Search attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);

          if (attempt < this.maxRetries) {
            await sleep(Math.min(5000 * attempt, 15_000));
          }
        }
      }

      if (!courseData.length) {
        throw createCourseraError(
          `Coursera search failed after ${this.maxRetries} attempt(s): ${lastError?.message || 'no results'}`,
          lastError
        );
      }

      // Page-size slice + simple next cursor
      const sliced = courseData.slice(0, pageSize);
      const nextPageCursor = courseData.length > pageSize ? String(page + 1) : null;

      return { courseData: sliced, nextPageCursor };

    } finally {
      await this._releasePage(pageCtx);
    }
  }

  async fetchDetails(externalIdOrUrl) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    const pageCtx = await this._acquirePage();

    const deepLink = externalIdOrUrl.startsWith('http')
      ? externalIdOrUrl
      : `${this.baseUrl}${externalIdOrUrl}`;

    try {
      // Scraper reliability fix: retain resources that may be required by the SPA.
      await pageCtx.setRequestInterception(true);
      pageCtx.removeAllListeners('request');

      pageCtx.on('request', req => {
        const type = req.resourceType();
        if (['image', 'font', 'media'].includes(type)) return req.abort();
        req.continue();
      });

      await pageCtx.goto(deepLink, {
        waitUntil: 'domcontentloaded',
        timeout: this.navigationTimeoutMs
      });

      try {
        const oneTrust = await pageCtx.$('#onetrust-accept-btn-handler');
        if (oneTrust) await oneTrust.click();
      } catch { }

      // Execute all scraping logic in one call for max efficiency
      const details = await pageCtx.evaluate(() => {
        const keyInfoBlock = document.querySelector('[data-e2e="key-information"]');
        // Scraper data-quality fix: the search result link can contain badges and
        // marketing copy. The course-page H1 is the canonical course title.
        const title = (document.querySelector('main h1, h1')?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim() || null;
        let rating = null;
        let level = null;
        let durationHours = null;
        let enrolledCount = null;
        let assessmentCount = null;

        // RATING: Coursera now renders the course rating as ordinary text next to
        // its review count instead of consistently exposing an aria rating element.
        try {
          const ratingSources = [
            keyInfoBlock?.textContent,
            document.querySelector('[data-e2e="reviews"]')?.textContent,
            document.body?.innerText
          ].filter(Boolean);

          for (const source of ratingSources) {
            const ratingMatch = String(source)
              .replace(/\s+/g, ' ')
              .match(/(?:^|\s)([0-5](?:\.\d{1,2})?)\s+[\d,]+\s+(?:reviews?|ratings?)\b/i);

            if (ratingMatch) {
              rating = Number(ratingMatch[1]);
              break;
            }
          }
        } catch (error) { }

        // LEVEL: Recommended proficiency level for the course
        try {
          if (keyInfoBlock) {
            // 1) Prefer nodes that explicitly say <Level> level (e.g, Beginner Level)
            const levelContainer = Array.from(keyInfoBlock.querySelectorAll('div'))
              .find(div => /\b(Beginner|Intermediate|Advanced)\b\s*level\b/i.test(div.textContent || ''));

            if (levelContainer) {
              const levelMatch = (levelContainer.textContent || '').match(/\b(Beginner|Intermediate|Advanced)\b/i);
              if (levelMatch) {
                const matchedLevelWord = levelMatch[1].toLowerCase();
                const normalizedLevels = {
                  beginner: 'Beginner',
                  intermediate: 'Intermediate',
                  advanced: 'Advanced',
                };
                level = normalizedLevels[matchedLevelWord];
              }
            }

            // 2) Fallback: some pages show just "Beginner" / "Intermediate" / "Advanced" without the word "level"
            if (!level) {
              const anyLevelContainer = Array.from(keyInfoBlock.querySelectorAll('div'))
                .find(div => /\b(Beginner|Intermediate|Advanced)\b/i.test(div.textContent || ''));

              if (anyLevelContainer) {
                const fallbackMatch = (anyLevelContainer.textContent || '').match(/\b(Beginner|Intermediate|Advanced)\b/i);
                if (fallbackMatch) {
                  const matchedLevelWord = fallbackMatch[1].toLowerCase();
                  const normalizedLevels = {
                    beginner: 'Beginner',
                    intermediate: 'Intermediate',
                    advanced: 'Advanced',
                  };
                  level = normalizedLevels[matchedLevelWord];
                }
              }
            }
          }
        } catch (error) { }

        // DURATION: Approximate duration of the course calculated in hours
        // Duration is sometimes null for courses less than 2 hours
        try {
          if (keyInfoBlock) {
            const childDivs = keyInfoBlock.querySelectorAll('div');
            const durationEl = Array.from(childDivs).find(div => div.textContent.includes('hour') || div.textContent.includes('month'));
            const durationText = durationEl ? durationEl.textContent.trim().toLowerCase() : null;
            if (durationText && durationText.includes('month') && durationText.includes('a week')) {
              const monthMatch = durationText.match(/(\d+)\s*month/);
              const hourMatch = durationText.match(/(\d+)\s*hour/);
              if (monthMatch && hourMatch) {
                const months = parseInt(monthMatch[1], 10);
                const hoursPerWeek = parseInt(hourMatch[1], 10);

                durationHours = Math.round(months * 4.33 * hoursPerWeek);
              }
            } else if (durationText && durationText.includes('hours to complete')) {
              const hourMatch = durationText.match(/(\d+)\s*hour/);
              durationHours = hourMatch ? parseInt(hourMatch[1], 10) : null;
            } else if (durationText && !(durationText.includes('month')) && durationText.includes('a week')) {
              const weekMatch = durationText.match(/(\d+)\s*week/);
              const hourMatch = durationText.match(/(\d+)\s*hour/);
              if (weekMatch && hourMatch) {
                const weeks = parseInt(weekMatch[1], 10);
                const hoursPerWeek = parseInt(hourMatch[1], 10);

                durationHours = weeks * hoursPerWeek;
              }
            } else if (durationText && !(durationText.includes('month')) && !(durationText.includes('week'))) {
              const hourMatch = durationText.match(/(\d+)\s*hour/);
              if (hourMatch) {
                durationHours = parseInt(hourMatch[1], 10)
              } else {
                durationHours = 1;
              }
            }
          }
        } catch (error) { }

        // ENROLLEDCOUNT: Number of students already enrolled in the course
        try {
          // Prefer the smallest matching node. Selecting a large parent can join the
          // start date (for example "Aug 19") to the enrollment count and inflate it.
          const enrolledEl = Array.from(document.querySelectorAll('p, div, span'))
            .filter(el => /already enrolled/i.test((el.textContent || '').trim()))
            .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];

          if (enrolledEl) {
            enrolledCount = (enrolledEl.textContent || '').replace(/\s+/g, ' ').trim();
            const numMatch = enrolledCount.match(/([\d,.]+)\s*already enrolled/i);
            if (numMatch) {
              enrolledCount = parseInt(numMatch[1].replace(/,/g, ''), 10);
            }
          }
        } catch (error) { }

        const aboutInfoBlock = document.querySelector('div[id="about"]');
        let skills = [];
        let learningOutcomes = [];
        let shareable = false;
        if (aboutInfoBlock) {
          // SKILLS: List of skills that can be gained through the course
          try {
            const skillsListEl = aboutInfoBlock.querySelectorAll('a[href*="courses?query="]');
            for (const listEl of skillsListEl) {
              skills.push(listEl.textContent.trim());
            }
          } catch (error) { }

          // LEARNING OUTCOMES: Outlines the expected result of the course
          try {
            const learningOutcomesListEl = aboutInfoBlock.querySelectorAll('div[data-track-component="what_you_will_learn_section"] li span:last-child');
            if (learningOutcomesListEl) {
              const learningOutcomesRaw = Array.from(learningOutcomesListEl).map(el => (el.textContent || '').replace(/\s+/g, ' ').trim());
              // Remove duplicates from learningOutcomesRaw and store in learningOutcomes
              learningOutcomes = Array.from(new Set(learningOutcomesRaw.filter(Boolean)));
            }
          } catch (error) { }

          // SHAREABLE CERTIFICATE: Is the certificate shareable on linkedIn?
          try {
            const shareableEl = Array.from(aboutInfoBlock.querySelectorAll('*'))
              .find(el => /shareable certificate/i.test((el.textContent || '').trim()));
            shareable = Boolean(shareableEl);
          } catch (error) { }

          // ASSESSMENTS: Number of assessments included in the course 
          // (Only available for Courses, not for specializations or professional certificates)
          try {
            const assessmentLabel = Array.from(aboutInfoBlock.querySelectorAll('div, span'))
              .find(el => /^assessments$/i.test((el.textContent || '').trim()));

            if (assessmentLabel && assessmentLabel.parentElement) {
              const assessmentEl = assessmentLabel.parentElement.querySelector('p');
              assessmentCount = assessmentEl ? (assessmentEl.textContent || '').trim().toLowerCase() : null;
            }

            if (assessmentCount) {
              const countMatch = assessmentCount.match(/(\d+)\s*(assignment|assignments|quiz|quizzes|assessment|assessments)/i);
              assessmentCount = countMatch ? parseInt(countMatch[1], 10) : null;
            }
          } catch (error) { }
        }

        return {
          title,
          rating,
          level,
          durationHours,
          skills,
          learningOutcomes,
          shareable,
          enrolledCount,
          assessmentCount
        };
      });

      // INSTRUCTORS: List of instructor(s) teaching the course
      let instructors = [];
      const hasMoreButton = await pageCtx.$('button[data-track-component="hero_instructors_modal_link"]');
      try {
        if (hasMoreButton) {
          await hasMoreButton.click().catch(() => { });
          // Give contents time to load
          await pageCtx
            .waitForSelector('div[data-testid="scroll-container"] a[data-track-component="hero_instructor"] span', {
              visible: true,
              timeout: 8000
            })
            .catch(() => { });

          const instructorsContainer = await pageCtx.$('div[data-testid="scroll-container"]');

          if (instructorsContainer) {
            instructors = await instructorsContainer.$$eval(
              'a[data-track-component="hero_instructor"]',
              els => els.map(e => {
                const spanContainer = e.querySelector('span');
                const name = spanContainer ? (spanContainer.textContent || '').trim() : null;
                const href = e.getAttribute('href') || null;
                if (!name) return null;
                return { name, href };
              }).filter(Boolean)
            );
          }
        } else {
          const oneInstructor = await pageCtx.$eval(
            'a[data-track-component="hero_instructor"]',
            el => {
              const spanContainer = el.querySelector('span');
              const name = spanContainer ? (spanContainer.textContent || '').trim() : null;
              const href = el.getAttribute('href') || null;
              if (!name) return null;
              return { name, href };
            }
          ).catch(() => null);
          if (oneInstructor) instructors.push(oneInstructor);
        }
      } catch (error) { }

      // Iterate through all instructors to go to instructor page and obtain bios
      try {

        const bioLimit = pLimit(3);

        const instructorsFinal = await Promise.all(
          instructors.map(instr =>
            bioLimit(async () => {
              const bio = await this._fetchInstructorBio(instr.href);
              return { name: instr.name, bio };
            })
          )
        );

        instructors = instructorsFinal;
      } catch (error) { }

      const pathname = new URL(deepLink).pathname;
      const certificationType = /\/specializations\//i.test(pathname) ? 'Specialization'
        : /\/professional-certificates\//i.test(pathname) ? 'Professional Certificate'
          : 'Course';

      const safe = details ?? { 
        title: null,
        rating: null,
        level: null, 
        durationHours: null, 
        skills: [], 
        learningOutcomes: [], 
        shareable: false,
        enrolledCount: null,
        assessmentCount: null
      };

      let reviews = [];
      if (this.options.includeReviews && (this.options.reviewLimit || 0) > 0) {
        try {
          reviews = await this.fetchReviews(deepLink, { limit: this.options.reviewLimit });
        } catch (error) {
          console.warn('[fetchDetails] reviews failed:', error.message);
        }
      }


      return {
        externalId: pathname,
        deepLink,
        platform: 'coursera',
        title: safe.title,
        rating: safe.rating,
        certificationType,
        level: safe.level,
        durationHours: safe.durationHours,
        skills: safe.skills,
        learningOutcomes: safe.learningOutcomes,
        instructors,
        shareable: safe.shareable,
        enrolledCount: safe.enrolledCount,
        assessmentCount: safe.assessmentCount,
        reviews
      };
    } finally {
      await this._releasePage(pageCtx);
    }
  }

  async fetchReviews(externalIdOrUrl, opts = { limit: 10 }) {
    console.log('[fetchReviews] start', externalIdOrUrl);

    if (!this.browser) throw new Error('Browser not initialized');

    const limit = Math.max(1, Number(opts.limit || this.options.reviewLimit || 10));
    const pageCtx = await this._acquirePage();

    const deepLink = externalIdOrUrl.startsWith('http')
      ? externalIdOrUrl
      : `${this.baseUrl}${externalIdOrUrl}`;

    try {
      // Scraper reliability fix: retain SPA resources while dropping heavy media.
      await pageCtx.setRequestInterception(true);
      pageCtx.removeAllListeners('request');

      pageCtx.on('request', req => {
        const type = req.resourceType();
        if (['image', 'font', 'media'].includes(type)) return req.abort();
        req.continue();
      });

      await pageCtx.goto(deepLink, {
        waitUntil: 'domcontentloaded',
        timeout: this.navigationTimeoutMs
      }).catch(() => {});

      // Check if the course has written reviews to begin with
      const hasReviews = await pageCtx.$('a[data-track-href="#reviews"]')
      if (!hasReviews) return []; // Course has no visible review UI

      // Create URL to go to reviews page from deepLink
      const reviewURLObj = new URL(deepLink);
      if (!reviewURLObj.pathname.endsWith('/reviews')) {
        reviewURLObj.pathname = reviewURLObj.pathname.replace(/\/$/, '') + '/reviews';
      }
      const reviewURL = reviewURLObj.toString();

      // Go to the review page of the course
      await pageCtx.goto(reviewURL, { waitUntil: 'domcontentloaded', timeout: 10_000 }).catch(() => {});

      let reviewsCollected = [];
      const seen = new Set();
      let pageHops = 0;

      while (reviewsCollected.length < limit) {
        const batch = await pageCtx.$$eval(
          '[data-e2e="reviews-list"] [class*="review-page-review"], .rc-ReviewsList [class*="review-page-review"]',
          (cards) => {
            const norm = (s) => (s ? s.replace(/\s+/g, ' ').trim() : null);

            const getRating = (card) => {
              const filledStars = card.querySelectorAll('svg[aria-labelledby*="FilledStar"]').length;
              if (filledStars) return filledStars || 0;
            };

            const getHelpful = (card) => {
              const helpfulBtn =
                card.querySelector('button.review-helpful-button') ||
                card.querySelector('button[class*="review-helpful-button"]');
              if (!helpfulBtn) return null;
              const text = helpfulBtn.innerText || helpfulBtn.textContent || '';
              const m = text.match(/\(([\d,]+)\)/);
              return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
            };

            return cards.map((card) => {
              const textEl = card.querySelector('[data-testid="cml-viewer"]');
              const authorEl = card.querySelector('.reviewerName, [class*="reviewerName"]');
              const dateEl = card.querySelector('.dateOfReview, [class*="dateOfReview"]');

              const author = authorEl?.textContent || '';
              const date = dateEl?.textContent || '';
              const text = textEl?.innerText || textEl?.textContent || '';

              return {
                _fingerprint: norm(`${author}|${date}|${text.slice(0, 80)}`), // local-only ID
                authorName: norm(author.replace(/^By\s+/i, '')),
                reviewCreatedAt: norm(date),
                rating: getRating(card),
                helpfulCount: getHelpful(card),
                body: norm(text),
              };
            });
          });

        let addedThisPage = 0;

        for (const review of batch) {
          if (!review || !review._fingerprint) continue;
          if (seen.has(review._fingerprint)) continue;
          seen.add(review._fingerprint);
          reviewsCollected.push({
            authorName: review.authorName,
            reviewCreatedAt: review.reviewCreatedAt,
            rating: review.rating,
            helpfulCount: review.helpfulCount,
            body: review.body,
          });
          addedThisPage++;
          if (reviewsCollected.length >= limit) break;
        }
        if (reviewsCollected.length >= limit) break;

        if (addedThisPage == 0) {
          break;
        }

        // Try to go to next page of reviews
        let advanced = false;
        const nextPageButton = await pageCtx.$('a[aria-label="Go to next page"]');
        if (nextPageButton) {
          const navSuccess = await Promise.all([
            pageCtx
              .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 7_000 })
              .then(() => true)
              .catch(() => false),
            nextPageButton.click().catch(() => { }),
          ]).then(([navOk]) => navOk);

          if (navSuccess) {
            advanced = true;
            pageHops++;
          }
        }

        if (!advanced) break;
        if (pageHops > 20) break;
      }

      console.log('[fetchReviews] done', externalIdOrUrl, reviewsCollected.length, 'pageHops=', pageHops);


      return reviewsCollected.slice(0, limit);
    } finally {
      await this._releasePage(pageCtx);
    }
  }
}

module.exports = CourseraProvider;






