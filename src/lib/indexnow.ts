/**
 * IndexNow submission utility for ARIA HUB.
 * Pings IndexNow (Bing, Yandex, Naver, Seznam) to immediately notify
 * search engines whenever pages or opportunities are published or updated.
 */

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '9761dc99a8ec4438bcfc3d1481ea2264';
export const SITE_HOST = 'www.myariahub.com';
export const KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

export async function submitToIndexNow(urls: string[]) {
  if (!urls || urls.length === 0) {
    return { success: false, message: 'No URLs provided' };
  }

  // Ensure absolute URLs on SITE_HOST
  const normalizedUrls = Array.from(
    new Set(
      urls.map((u) => {
        if (u.startsWith('http://') || u.startsWith('https://')) return u;
        return `https://${SITE_HOST}${u.startsWith('/') ? '' : '/'}${u}`;
      })
    )
  );

  try {
    const payload = {
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: normalizedUrls,
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: res.ok || res.status === 200 || res.status === 202,
      status: res.status,
      count: normalizedUrls.length,
      urls: normalizedUrls,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Network error submitting to IndexNow',
    };
  }
}
