/**
 * HTTP client for the Flask API. Query string keys match the backend (e.g. `search`, `account_id`).
 * Method parameter names mirror backend *semantics* (e.g. activityIdOrActivityName → sent as `search`).
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async request(path, { method = 'GET', query, body, headers } = {}) {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v == null || v === '') continue
        url.searchParams.set(k, String(v))
      }
    }

    const init = {
      method,
      headers: {
        ...(body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(headers || {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    }

    const res = await fetch(url.toString(), init)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data?.message || `HTTP ${res.status}`)
      err.status = res.status
      err.data = data
      throw err
    }
    return data
  }

  // Auth
  getProfiles() {
    return this.request('/api/profiles')
  }
  login(payload) {
    return this.request('/api/login', { method: 'POST', body: payload })
  }

  // User profiles (backend: profile_id_or_profile_name ← query `search`)
  listUserProfiles(profileIdOrProfileName) {
    return this.request('/api/user-profiles', { query: { search: profileIdOrProfileName } })
  }
  getUserProfile(profileId) {
    return this.request(`/api/user-profiles/${profileId}`)
  }
  createUserProfile(payload) {
    return this.request('/api/user-profiles', { method: 'POST', body: payload })
  }
  updateUserProfile(profileId, payload) {
    return this.request(`/api/user-profiles/${profileId}`, { method: 'PUT', body: payload })
  }
  suspendUserProfile(profileId, suspend) {
    return this.request(`/api/user-profiles/${profileId}/suspend`, {
      method: 'POST',
      body: { suspend },
    })
  }

  // User accounts (backend: account_id_or_email ← query `search`)
  listUserAccounts(accountIdOrEmail) {
    return this.request('/api/user-accounts', { query: { search: accountIdOrEmail } })
  }
  viewUserAccount(accountId) {
    return this.request(`/api/user-accounts/${accountId}`)
  }
  createUserAccount(payload) {
    return this.request('/api/user-accounts', { method: 'POST', body: payload })
  }
  updateUserAccount(accountId, payload) {
    return this.request(`/api/user-accounts/${accountId}`, { method: 'PUT', body: payload })
  }
  suspendUserAccount(accountId, suspend) {
    return this.request(`/api/user-accounts/${accountId}/suspend`, {
      method: 'POST',
      body: { suspend },
    })
  }

  // Categories (backend: category_id OR category_name pattern ← query `search`)
  listCategories(categoryIdOrCategoryName) {
    return this.request('/api/categories', { query: { search: categoryIdOrCategoryName } })
  }
  listCategoriesWithActivities() {
    return this.request('/api/categories-with-activities')
  }
  getCategory(categoryId) {
    return this.request(`/api/categories/${categoryId}`)
  }
  createCategory(payload) {
    return this.request('/api/categories', { method: 'POST', body: payload })
  }
  updateCategory(categoryId, payload) {
    return this.request(`/api/categories/${categoryId}`, { method: 'PUT', body: payload })
  }
  deleteCategory(categoryId) {
    return this.request(`/api/categories/${categoryId}`, { method: 'DELETE' })
  }

  // Platform manager — fundraising performance (daily / weekly / monthly)
  getDailyFundraisingReport({ accountId, date } = {}) {
    return this.request('/api/platform/reports/fundraising/daily', {
      query: { account_id: accountId, date },
    })
  }
  getWeeklyFundraisingReport({ accountId, date } = {}) {
    return this.request('/api/platform/reports/fundraising/weekly', {
      query: { account_id: accountId, date },
    })
  }
  getMonthlyFundraisingReport({ accountId, month } = {}) {
    return this.request('/api/platform/reports/fundraising/monthly', {
      query: { account_id: accountId, month },
    })
  }
  // FRA (backend: activity_id_or_activity_name ← query `search`)
  listActivities({
    accountId,
    activityIdOrActivityName,
    categoryId,
    status,
    dateFrom,
    dateTo,
  } = {}) {
    return this.request('/api/fundraising-activities', {
      query: {
        account_id: accountId,
        search: activityIdOrActivityName,
        category_id: categoryId,
        status,
        date_from: dateFrom,
        date_to: dateTo,
      },
    })
  }
  listCompletedActivityHistory({
    accountId,
    activityIdOrActivityName,
    categoryId,
    dateFrom,
    dateTo,
  } = {}) {
    return this.request('/api/fundraising-activities/history', {
      query: {
        account_id: accountId,
        search: activityIdOrActivityName,
        category_id: categoryId,
        date_from: dateFrom,
        date_to: dateTo,
      },
    })
  }
  createActivity(payload) {
    return this.request('/api/fundraising-activities', { method: 'POST', body: payload })
  }
  viewActivity(activityId, accountId) {
    return this.request(`/api/fundraising-activities/${activityId}`, {
      query: { account_id: accountId },
    })
  }
  viewCompletedActivity(activityId, accountId) {
    return this.request(`/api/fundraising-activities/history/${activityId}`, {
      query: { account_id: accountId },
    })
  }
  updateActivity(activityId, payload) {
    return this.request(`/api/fundraising-activities/${activityId}`, { method: 'PUT', body: payload })
  }
  deleteActivity(activityId, accountId) {
    return this.request(`/api/fundraising-activities/${activityId}`, {
      method: 'DELETE',
      query: { account_id: accountId },
    })
  }

  // Public activities — donee browse (backend: activity / category filter ← query `search`)
  listPublicActivities(activityIdOrActivityName) {
    return this.request('/api/public/activities', { query: { search: activityIdOrActivityName } })
  }
  viewPublicActivity(activityId) {
    return this.request(`/api/public/activities/${activityId}`)
  }

  // Donee favorites (backend: activity_id OR name OR category name ← query `search`)
  listDoneeFavorites(accountId, activityIdOrNameOrCategory) {
    return this.request('/api/donee/favorites', {
      query: { account_id: accountId, search: activityIdOrNameOrCategory },
    })
  }
  addDoneeFavorite(accountId, activityId) {
    return this.request('/api/donee/favorites', {
      method: 'POST',
      body: { account_id: accountId, activity_id: activityId },
    })
  }
  removeDoneeFavorite(accountId, activityId) {
    return this.request(`/api/donee/favorites/${activityId}`, {
      method: 'DELETE',
      query: { account_id: accountId },
    })
  }

  // Donee donation history (backend: activity_id OR activity_name OR category ← query `search`)
  listDoneeDonations({
    accountId,
    categoryId,
    dateFrom,
    dateTo,
    activityIdOrCategoryName,
  } = {}) {
    return this.request('/api/donee/donations', {
      query: {
        account_id: accountId,
        category_id: categoryId,
        date_from: dateFrom,
        date_to: dateTo,
        search: activityIdOrCategoryName,
      },
    })
  }
  viewDoneeDonation(accountId, donationId) {
    return this.request(`/api/donee/donations/${donationId}`, {
      query: { account_id: accountId },
    })
  }
  recordDoneeDonation({ accountId, activityId, amount, donatedAt } = {}) {
    const body = {
      activity_id: activityId,
      amount,
    }
    if (accountId != null) body.account_id = accountId
    if (donatedAt) body.donated_at = donatedAt
    return this.request('/api/donee/donations', { method: 'POST', body })
  }
}

export const api = new ApiClient('')

