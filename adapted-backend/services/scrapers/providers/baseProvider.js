// services/scrapers/providers/baseProvider.js


//  Minimal interface every provider scraper should follow.
//  This lets us add Udemy/Skillshare later without touching call sites.
 
class BaseProvider {
  constructor(options = {}) {
    this.options = options;
  }


   // fetchList(opts): returns { items: [...], nextPageCursor?: string }
   // items: minimal cards w/ externalId, deepLink, title, imageUrl, rating, ratingCount
   // Use nextPageCursor for pagination when applicable

  async fetchList(opts = { page: 1, pageSize: 20, query: '', filters: {} }) {
    throw new Error('fetchList not implemented');
  }


   // fetchDetails(externalIdOrUrl): returns a normalized full course object
   // Should fill in description, syllabus, instructors, level, durations, etc.

  async fetchDetails(externalIdOrUrl) {
    throw new Error('fetchDetails not implemented');
  }

  async fetchReviews(externalIdOrUrl, opts = { limit: 10 }) {
    throw new Error('fetchReviews not implemented');
  }
}

module.exports = BaseProvider;
