'use client'

import { useEffect, useState } from 'react'
import { MapPin, Droplets, Wind } from 'lucide-react'

interface WeatherData {
  temp: number
  feelsLike: number
  humidity: number
  windspeed: number
  code: number
  city: string
}

const WMO_LABEL: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'ท้องฟ้าแจ่มใส', emoji: '☀️' },
  1:  { label: 'แจ่มใสเป็นส่วนใหญ่', emoji: '🌤️' },
  2:  { label: 'มีเมฆบางส่วน', emoji: '⛅' },
  3:  { label: 'เมฆมาก', emoji: '☁️' },
  45: { label: 'หมอก', emoji: '🌫️' },
  48: { label: 'หมอกน้ำค้าง', emoji: '🌫️' },
  51: { label: 'ฝนปรอยๆ', emoji: '🌦️' },
  53: { label: 'ฝนปรอย', emoji: '🌦️' },
  55: { label: 'ฝนปรอยหนัก', emoji: '🌧️' },
  61: { label: 'ฝนเล็กน้อย', emoji: '🌧️' },
  63: { label: 'ฝนปานกลาง', emoji: '🌧️' },
  65: { label: 'ฝนหนัก', emoji: '🌧️' },
  80: { label: 'ฝนฟ้าคะนอง', emoji: '⛈️' },
  95: { label: 'พายุฝนฟ้าคะนอง', emoji: '⛈️' },
}

function getWeatherInfo(code: number) {
  return WMO_LABEL[code] ?? { label: 'ไม่ทราบสภาพอากาศ', emoji: '🌡️' }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=th`,
      { headers: { 'User-Agent': 'bhawana-app' } }
    )
    const data = await res.json()
    return data.address?.city ?? data.address?.town ?? data.address?.county ?? 'ที่ตั้งของคุณ'
  } catch {
    return 'ที่ตั้งของคุณ'
  }
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude: lat, longitude: lon } = coords
          const [weatherRes, city] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,windspeed_10m,weathercode&timezone=Asia%2FBangkok`
            ),
            reverseGeocode(lat, lon),
          ])
          const data = await weatherRes.json()
          const c = data.current
          setWeather({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            humidity: c.relative_humidity_2m,
            windspeed: Math.round(c.windspeed_10m),
            code: c.weathercode,
            city,
          })
        } catch {
          setError(true)
        } finally {
          setLoading(false)
        }
      },
      () => {
        // permission denied — fallback กรุงเทพฯ
        fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.52&current=temperature_2m,apparent_temperature,relative_humidity_2m,windspeed_10m,weathercode&timezone=Asia%2FBangkok'
        )
          .then(r => r.json())
          .then(data => {
            const c = data.current
            setWeather({
              temp: Math.round(c.temperature_2m),
              feelsLike: Math.round(c.apparent_temperature),
              humidity: c.relative_humidity_2m,
              windspeed: Math.round(c.windspeed_10m),
              code: c.weathercode,
              city: 'กรุงเทพฯ',
            })
          })
          .catch(() => setError(true))
          .finally(() => setLoading(false))
      }
    )
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-2xl p-3 animate-pulse">
        <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error || !weather) return null

  const { label, emoji } = getWeatherInfo(weather.code)

  return (
    <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
      <div className="flex items-center gap-1 px-0.5">
        <MapPin size={9} className="text-gray-400" />
        <p className="text-[10px] font-semibold text-gray-400 truncate">{weather.city}</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black text-gray-900 leading-none">{weather.temp}°</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
        </div>
        <span className="text-3xl">{emoji}</span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <div className="bg-white rounded-lg p-1.5 text-center">
          <p className="text-[10px] font-bold text-gray-700">{weather.feelsLike}°</p>
          <p className="text-[9px] text-gray-400">รู้สึก</p>
        </div>
        <div className="bg-white rounded-lg p-1.5 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <Droplets size={8} className="text-blue-400" />
            <p className="text-[10px] font-bold text-gray-700">{weather.humidity}%</p>
          </div>
          <p className="text-[9px] text-gray-400">ความชื้น</p>
        </div>
        <div className="bg-white rounded-lg p-1.5 text-center">
          <div className="flex items-center justify-center gap-0.5">
            <Wind size={8} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-700">{weather.windspeed}</p>
          </div>
          <p className="text-[9px] text-gray-400">km/h</p>
        </div>
      </div>
    </div>
  )
}
