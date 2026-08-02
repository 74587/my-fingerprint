export const IpApi = {
  getIp(): Promise<{
    query: string
    countryCode: string
    timezone: string
  }> {
    return fetch('http://ip-api.com/json/').then(res => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
  }
}