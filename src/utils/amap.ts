/**
 * 高德地图 (AMap) 2.0 JS SDK 异步加载与选址工具模块
 */

export const AMAP_CONFIG = {
  key: (import.meta.env.VITE_AMAP_KEY as string) || '',
  securityJsCode: (import.meta.env.VITE_AMAP_SECURITY_JS_CODE as string) || '',
  version: '2.0'
}

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string
      serviceHost?: string
    }
    AMap?: any
  }
}

let amapLoadPromise: Promise<any> | null = null
const AMAP_PLUGINS = ['AMap.Geolocation', 'AMap.Geocoder', 'AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.Circle']

function ensureAMapPlugins(AMap: any): Promise<any> {
  if (!AMap?.plugin) return Promise.resolve(AMap)
  return new Promise((resolve) => {
    AMap.plugin(AMAP_PLUGINS, () => {
      if (typeof AMap.getConfig === 'function') {
        AMap.getConfig().appname = 'amap-jsapi-skill'
      }
      resolve(AMap)
    })
  })
}

/**
 * 确保高德地图 2.0 SDK 注入安全密钥并完成异步加载
 */
export function loadAMapSDK(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('AMap can only run in browser environment'))
  }

  if (window.AMap && window.AMap.Map) {
    return ensureAMapPlugins(window.AMap)
  }

  if (amapLoadPromise) {
    return amapLoadPromise
  }

  if (!AMAP_CONFIG.key) {
    console.warn('[AMap] 未配置 VITE_AMAP_KEY，跳过高德地图 SDK 加载')
    return Promise.reject(new Error('未配置高德地图 API Key (VITE_AMAP_KEY)'))
  }

  amapLoadPromise = new Promise((resolve, reject) => {
    // 注入高德安全密钥（必须在引入 JS 之前注入）
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_CONFIG.securityJsCode
    }

    if (window.AMap) {
      ensureAMapPlugins(window.AMap).then(resolve)
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.version}&key=${AMAP_CONFIG.key}&plugin=AMap.Geolocation,AMap.Geocoder,AMap.AutoComplete,AMap.PlaceSearch,AMap.Circle`

    script.onload = () => {
      if (window.AMap) {
        ensureAMapPlugins(window.AMap).then(resolve)
      } else {
        amapLoadPromise = null
        reject(new Error('AMap script loaded but window.AMap is undefined'))
      }
    }

    script.onerror = err => {
      amapLoadPromise = null
      reject(err)
    }

    document.head.appendChild(script)
  })

  return amapLoadPromise
}

/**
 * 逆地理编码：根据经纬度反查结构化地址与 POI 信息
 */
export async function getAddressByCoords(
  lng: number,
  lat: number
): Promise<{ formattedAddress: string; poiName?: string }> {
  const AMap = await loadAMapSDK()
  return new Promise((resolve, reject) => {
    const geocoder = new AMap.Geocoder({
      city: '全国',
      radius: 1000
    })

    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result.regeocode) {
        const addr = result.regeocode.formattedAddress || ''
        const pois = result.regeocode.pois || []
        const poiName = pois.length > 0 ? pois[0].name : ''
        resolve({
          formattedAddress: addr,
          poiName: poiName || addr
        })
      } else {
        reject(new Error('逆地理编码失败: ' + status))
      }
    })
  })
}
