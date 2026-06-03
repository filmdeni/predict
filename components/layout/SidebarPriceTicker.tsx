import PriceTickerCard from './PriceTickerCard'
import { fetchAllPrices } from '@/lib/prices'

export default async function SidebarPriceTicker() {
  let data
  try {
    data = await fetchAllPrices()
  } catch {
    return null
  }

  const items = [
    { label: 'ดีเซล B7',      value: data.diesel.toFixed(2),    unit: 'บ./ลิตร' },
    { label: 'แก๊สโซฮอล์ 91', value: data.gasohol91.toFixed(2), unit: 'บ./ลิตร' },
    { label: 'แก๊สโซฮอล์ 95', value: data.gasohol95.toFixed(2), unit: 'บ./ลิตร' },
    { label: 'E20',            value: data.e20.toFixed(2),       unit: 'บ./ลิตร' },
  ]

  return <PriceTickerCard items={items} updatedAt={data.updatedAt} />
}
