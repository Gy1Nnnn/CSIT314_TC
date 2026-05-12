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

  // User profiles
  listUserProfiles(search) {
    return this.request('/api/user-profiles', { query: { search } })
  }
  viewUserProfile(profileId) {
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

  // User accounts
  listUserAccounts(search) {
    return this.request('/api/user-accounts', { query: { search } })
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

  // Categories
  listCategories(search) {
    return this.request('/api/categories', { query: { search } })
  }
  listCategoriesWithActivities() {
    return this.request('/api/categories-with-activities')
  }
  createCategory(payload) {
    return this.request('/api/categories', { method: 'POST', body: payload })
  }
  updateCategory(categoryId, payload) {
    return this.request(`/api/categories/${categoryId}`, { method: 'PUT', body: payload })
  }
  suspendCategory(categoryId, suspend) {
    return this.request(`/api/categories/${categoryId}/suspend`, {
      method: 'POST',
      body: { suspend },
    })
  }

  // FRA
  listActivities({ accountId, search } = {}) {
    return this.request('/api/fundraising-activities', {
      query: { account_id: accountId, search },
    })
  }
  listCompletedActivityHistory({
    accountId,
    search,
    categoryId,
    dateFrom,
    dateTo,
  } = {}) {
    return this.request('/api/fundraising-activities/history', {
      query: {
        account_id: accountId,
        search,
        category_id: categoryId,
        date_from: dateFrom,
        date_to: dateTo,
      },
    })
  }
  /** Owner detail; includes ``view_count`` and ``favorite_count`` (does not increment views). */
  viewMyActivity(activityId, accountId) {
    return this.request(`/api/fundraising-activities/${activityId}`, {
      query: { account_id: accountId },
    })
  }
  createActivity(payload) {
    return this.request('/api/fundraising-activities', { method: 'POST', body: payload })
  }
  updateActivity(activityId, payload) {
    return this.request(`/api/fundraising-activities/${activityId}`, { method: 'PUT', body: payload })
  }
  suspendActivity(activityId, payload) {
    return this.request(`/api/fundraising-activities/${activityId}/suspend`, {
      method: 'POST',
      body: payload,
    })
  }

  // Public activities (donee / browse)
  listPublicActivities(search) {
    return this.request('/api/public/activities', { query: { search } })
  }
  viewPublicActivity(activityId) {
    return this.request(`/api/public/activities/${activityId}`)
  }

  // Donee favorites
  listDoneeFavorites(accountId, search) {
    return this.request('/api/donee/favorites', {
      query: { account_id: accountId, search },
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
}

export const api = new ApiClient('')

