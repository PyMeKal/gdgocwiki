import axios from 'axios'

export function mockAxios(handler) {
  axios.defaults.adapter = async (config) => {
    const response = await handler(config.url, { ...config, method: config.method.toUpperCase() })
    return {
      data: await response.text(),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      config,
    }
  }
}
