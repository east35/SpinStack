const Discogs = require('disconnect').Client;
const axios = require('axios');

class DiscogsService {
  constructor() {
    // Don't load env vars in constructor - they might not be loaded yet
  }

  get consumerKey() {
    return process.env.DISCOGS_CONSUMER_KEY;
  }

  get consumerSecret() {
    return process.env.DISCOGS_CONSUMER_SECRET;
  }

  get userAgent() {
    return process.env.DISCOGS_USER_AGENT ||
      'VinylApp/1.0 (+https://github.com/your-org/vinylapp)';
  }

  createClient(options = {}) {
    const authLevel =
      options.method === 'oauth' && options.token && options.tokenSecret
        ? 2
        : options.level;

    return new Discogs({
      userAgent: this.userAgent,
      ...options,
      // Ensure authenticated clients are treated as level 2 for identity/collection calls
      ...(authLevel ? { level: authLevel } : {}),
    });
  }

  // Get OAuth request token
  async getRequestToken(callbackUrl) {
    return new Promise((resolve, reject) => {
      const client = this.createClient();
      client.oauth().getRequestToken(
        this.consumerKey,
        this.consumerSecret,
        callbackUrl,
        (err, requestData) => {
          if (err) {
            reject(err);
          } else {
            resolve(requestData);
          }
        }
      );
    });
  }

  // Get OAuth access token
  async getAccessToken(oauthToken, oauthTokenSecret, verifier) {
    return new Promise((resolve, reject) => {
      const client = this.createClient({
        method: 'oauth',
        consumerKey: this.consumerKey,
        consumerSecret: this.consumerSecret,
        token: oauthToken,
        tokenSecret: oauthTokenSecret
      });
      client.oauth().getAccessToken(verifier, (err, accessData) => {
        if (err) {
          reject(err);
        } else {
          resolve(accessData);
        }
      });
    });
  }

  // Get authenticated user's identity
  async getIdentity(accessToken, accessSecret) {
    const client = this.createClient({
      method: 'oauth',
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      token: accessToken,
      tokenSecret: accessSecret
    });

    return new Promise((resolve, reject) => {
      client.getIdentity((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  // Get user's collection
  async getUserCollection(username, accessToken, accessSecret, folderId = 0) {
    const dis = this.createClient({
      method: 'oauth',
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      token: accessToken,
      tokenSecret: accessSecret
    }).user().collection();

    return new Promise((resolve, reject) => {
      dis.getReleases(username, folderId, { page: 1, per_page: 100 }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  // Get all pages of collection
  async getAllCollectionReleases(username, accessToken, accessSecret, folderId = 0) {
    const dis = this.createClient({
      method: 'oauth',
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      token: accessToken,
      tokenSecret: accessSecret
    }).user().collection();

    let allReleases = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await new Promise((resolve, reject) => {
        dis.getReleases(username, folderId, { page, per_page: 100 }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      allReleases = allReleases.concat(data.releases);

      if (data.pagination.page >= data.pagination.pages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allReleases;
  }

  // Get release details
  async getRelease(releaseId, accessToken, accessSecret) {
    const dis = this.createClient({
      method: 'oauth',
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      token: accessToken,
      tokenSecret: accessSecret
    }).database();

    return new Promise((resolve, reject) => {
      dis.getRelease(releaseId, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
}

module.exports = new DiscogsService();
