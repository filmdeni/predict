import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_USER_IDS = [
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0001-000000000005',
]
const BOT_WAGERS = [80, 120, 60, 100, 150]

// Template คำถามการเมืองไทย: keyword ใช้ค้นหาใน GDELT เพื่อเฉลย
const POLITICS_TEMPLATES = [
  {
    id: 'cabinet_reshuffle',
    title: 'วันนี้จะมีข่าวปรับคณะรัฐมนตรีไหม?',
    keywords: ['ปรับ ครม', 'ปรับคณะรัฐมนตรี', 'cabinet reshuffle Thailand'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=thaigov.go.th',
  },
  {
    id: 'parliament_vote',
    title: 'วันนี้จะมีการโหวตในสภาผู้แทนราษฎรไหม?',
    keywords: ['โหวตสภา', 'ลงมติสภา', 'parliament vote Thailand'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=parliament.go.th',
  },
  {
    id: 'protest',
    title: 'วันนี้จะมีการชุมนุมทางการเมืองในกรุงเทพฯ ไหม?',
    keywords: ['ชุมนุม กรุงเทพ', 'ประท้วง การเมือง', 'protest Bangkok Thailand politics'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=matichon.co.th',
  },
  {
    id: 'pm_statement',
    title: 'วันนี้นายกรัฐมนตรีจะออกแถลงการณ์สำคัญไหม?',
    keywords: ['นายกแถลง', 'นายกรัฐมนตรีแถลง', 'Thai PM statement announcement'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=thaigov.go.th',
  },
  {
    id: 'no_confidence',
    title: 'วันนี้จะมีข่าวยื่นอภิปรายไม่ไว้วางใจไหม?',
    keywords: ['อภิปรายไม่ไว้วางใจ', 'ยื่นญัตติ', 'no confidence motion Thailand'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=parliament.go.th',
  },
  {
    id: 'dissolve_parliament',
    title: 'วันนี้จะมีข่าวยุบสภาไหม?',
    keywords: ['ยุบสภา', 'dissolve parliament Thailand'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=ect.go.th',
  },
  {
    id: 'election_news',
    title: 'วันนี้จะมีข่าวเกี่ยวกับการเลือกตั้งไหม?',
    keywords: ['เลือกตั้ง ไทย', 'กกต', 'Thailand election ECT'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=ect.go.th',
  },
  {
    id: 'party_drama',
    title: 'วันนี้จะมีดราม่าภายในพรรคการเมืองไหม?',
    keywords: ['พรรค แตกแยก', 'ลาออกจากพรรค', 'Thai party political drama split'],
    image_url: 'https://www.google.com/s2/favicons?sz=64&domain=matichon.co.th',
  },
]

async function alreadySeededToday(templateId: string): Promise<boolean> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('questions')
    .select('id')
    .gte('created_at', startOfDay.toISOString())
    .ilike('description', `%"template_id":"${templateId}"%`)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function seedMockPredictions(questionId: string) {
  const bets = BOT_USER_IDS.map((userId, i) => ({
    question_id: questionId,
    user_id: userId,
    option_id: Math.random() < 0.55 ? 'yes' : 'no',
    coins_wagered: BOT_WAGERS[i],
  }))

  const poolYes = bets.filter(b => b.option_id === 'yes').reduce((s, b) => s + b.coins_wagered, 0)
  const poolNo = bets.filter(b => b.option_id === 'no').reduce((s, b) => s + b.coins_wagered, 0)
  const total = poolYes + poolNo

  await supabase.from('predictions').insert(
    bets.map(b => ({
      ...b,
      odds_at_time: b.option_id === 'yes'
        ? (poolYes > 0 ? total / poolYes : 1)
        : (poolNo > 0 ? total / poolNo : 1),
    }))
  )

  await supabase
    .from('questions')
    .update({ pool: { yes: poolYes, no: poolNo }, total_pool: total, predictions_count: bets.length })
    .eq('id', questionId)
}

function isAuthorized(req: Request): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

async function handler(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const dateLabel = now.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })

  // closes end of day Bangkok time (17:00 UTC = midnight Bangkok)
  const closesAt = new Date(now)
  closesAt.setUTCHours(17, 0, 0, 0)
  if (closesAt <= now) closesAt.setUTCDate(closesAt.getUTCDate() + 1)

  const results: object[] = []

  for (const tmpl of POLITICS_TEMPLATES) {
    try {
      if (await alreadySeededToday(tmpl.id)) {
        results.push({ template_id: tmpl.id, skipped: 'already seeded today' })
        continue
      }

      const { data: q, error } = await supabase
        .from('questions')
        .insert({
          category_id: 4,
          created_by: BOT_USER_IDS[0],
          title: `${tmpl.title} (${dateLabel})`,
          description: JSON.stringify({
            type: 'politics',
            template_id: tmpl.id,
            keywords: tmpl.keywords,
          }),
          image_url: tmpl.image_url,
          options: [
            { id: 'yes', label: 'มี / ใช่' },
            { id: 'no',  label: 'ไม่มี / ไม่ใช่' },
          ],
          closes_at: closesAt.toISOString(),
          card_style: 'gauge',
        })
        .select('id')
        .single()

      if (error) throw error
      await seedMockPredictions(q.id)
      results.push({ template_id: tmpl.id, question_id: q.id })
    } catch (err) {
      results.push({ template_id: tmpl.id, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, seeded: results.filter((r: any) => r.question_id).length, results })
}
