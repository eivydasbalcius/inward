/**
 * Sample content so every page renders. Everything is marked [PAVYZDYS]/[SAMPLE] and must be replaced in /admin.
 * Run: pnpm seed   (only fills collections/globals that are still empty – never overwrites edits)
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const p = (text: string) => ({
  type: 'paragraph',
  version: 1,
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  textFormat: 0,
  children: [
    { type: 'text', version: 1, text, format: 0, style: '', mode: 'normal' as const, detail: 0 },
  ],
})
const h2 = (text: string) => ({ ...p(text), type: 'heading', tag: 'h2' })
const doc = (...children: ReturnType<typeof p>[]) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children,
  },
})

const payload = await getPayload({ config })

async function empty(collection: 'services' | 'faqs' | 'testimonials' | 'posts') {
  const { totalDocs } = await payload.count({ collection })
  if (totalDocs) payload.logger.info(`seed: ${collection} already has ${totalDocs} docs, skipping`)
  return totalDocs === 0
}

// Create in LT, then add the EN translation to the same document.
async function bilingual<C extends 'services' | 'faqs' | 'testimonials' | 'posts'>(
  collection: C,
  lt: Record<string, unknown>,
  en: Record<string, unknown>,
) {
  const created = await payload.create({ collection, locale: 'lt', data: lt as never })
  await payload.update({ collection, id: created.id, locale: 'en', data: en as never })
}

if (await empty('services')) {
  await bilingual(
    'services',
    {
      title: 'Individuali meno terapijos sesija',
      slug: 'individuali-sesija',
      summary:
        '[PAVYZDYS] Asmeninis susitikimas, kuriame per kūrybą tyrinėjame Jums rūpimas temas.',
      body: doc(
        p(
          '[PAVYZDYS] Individualios sesijos metu kartu ieškome, kas slypi už žodžių. Nereikia mokėti piešti – svarbus procesas, o ne rezultatas.',
        ),
      ),
      format: 'individual',
      mode: ['in-person', 'online'],
      durationMin: 50,
      priceEur: 45,
      sessionsCount: 1,
      whoFor: [
        { text: 'Jaučiate nerimą, įtampą ar emocinį išsekimą' },
        { text: 'Norite geriau pažinti save' },
      ],
      notFor: [{ text: 'Tikitės išmokti piešti – tai ne dailės pamoka' }],
      supplies:
        'Visas priemones parūpinu studijoje. Nuotolinei sesijai – popierius, spalvoti pieštukai ar kreidelės.',
      order: 1,
    },
    {
      title: 'Individual art therapy session',
      summary: '[SAMPLE] A one-to-one session exploring what matters to you through creative work.',
      body: doc(
        p(
          '[SAMPLE] In an individual session we look for what lies beyond words. No drawing skills needed – the process matters, not the result.',
        ),
      ),
      whoFor: [
        { text: 'You feel anxiety, tension or emotional exhaustion' },
        { text: 'You want to understand yourself better' },
      ],
      notFor: [{ text: 'You expect to learn drawing – this is not an art class' }],
      supplies:
        'All materials are provided in the studio. For online sessions – paper and coloured pencils or pastels.',
    },
  )
  await bilingual(
    'services',
    {
      title: 'Grupinė meno terapija',
      slug: 'grupine-terapija',
      summary: '[PAVYZDYS] Nedidelė grupė, bendra kūrybinė patirtis ir palaikymas.',
      body: doc(
        p(
          '[PAVYZDYS] Grupėje dalijamės patirtimi, mokomės vieni iš kitų ir kuriame kartu saugioje aplinkoje.',
        ),
      ),
      format: 'group',
      mode: ['in-person'],
      durationMin: 90,
      priceEur: 25,
      sessionsCount: 1,
      groupSize: 6,
      whoFor: [{ text: 'Norite pasijusti ne vieni su savo patirtimi' }],
      order: 2,
    },
    {
      title: 'Group art therapy',
      summary: '[SAMPLE] A small group, a shared creative experience and support.',
      body: doc(
        p(
          '[SAMPLE] In a group we share experiences, learn from each other and create together in a safe environment.',
        ),
      ),
      whoFor: [{ text: 'You want to feel less alone with your experience' }],
    },
  )
  await bilingual(
    'services',
    {
      title: 'Pirmoji konsultacija',
      slug: 'pirmoji-konsultacija',
      summary: '[PAVYZDYS] Trumpas susipažinimas: aptariame lūkesčius ir tinkamiausią formatą.',
      format: 'individual',
      mode: ['online'],
      durationMin: 30,
      priceEur: 20,
      order: 0,
    },
    {
      title: 'First consultation',
      summary: '[SAMPLE] A short introduction: we discuss your expectations and the best format.',
    },
  )
}

if (await empty('faqs')) {
  const faqs = [
    [
      'Ar reikia mokėti piešti?',
      '[PAVYZDYS] Ne. Meno terapijoje svarbus procesas ir jausmai, o ne gražus rezultatas.',
      'Do I need to know how to draw?',
      '[SAMPLE] No. Art therapy is about the process and feelings, not a beautiful result.',
    ],
    [
      'Kaip atšaukti sesiją?',
      '[PAVYZDYS] Sesiją galite nemokamai atšaukti paspaudę nuorodą patvirtinimo laiške ne vėliau kaip likus 24 val. iki susitikimo – pinigai grąžinami.',
      'How do I cancel a session?',
      '[SAMPLE] You can cancel free of charge via the link in your confirmation email up to 24 hours before the session – you get a full refund.',
    ],
    [
      'Ar sesijos konfidencialios?',
      '[PAVYZDYS] Taip. Viskas, kas vyksta sesijoje, lieka tarp mūsų, išskyrus įstatymų numatytas išimtis.',
      'Are sessions confidential?',
      '[SAMPLE] Yes. Everything shared in a session stays between us, except for legally required exceptions.',
    ],
  ]
  for (const [i, [q, a, qEn, aEn]] of faqs.entries()) {
    await bilingual(
      'faqs',
      { question: q, answer: a, order: i, showOnHome: true },
      { question: qEn, answer: aEn },
    )
  }
}

if (await empty('testimonials')) {
  await bilingual(
    'testimonials',
    { name: 'Vardas P.', quote: '[PAVYZDYS] Pirmą kartą pasijutau išgirsta be žodžių.', order: 1 },
    { quote: '[SAMPLE] For the first time I felt heard without words.' },
  )
  await bilingual(
    'testimonials',
    { name: 'Vardas K.', quote: '[PAVYZDYS] Šilta, saugi erdvė. Išėjau lengvesnė.', order: 2 },
    { quote: '[SAMPLE] A warm, safe space. I left feeling lighter.' },
  )
}

if (await empty('posts')) {
  await bilingual(
    'posts',
    {
      title: 'Kas yra meno terapija?',
      slug: 'kas-yra-meno-terapija',
      excerpt:
        '[PAVYZDYS] Trumpai apie tai, kaip kūryba padeda išreikšti tai, ką sunku pasakyti žodžiais.',
      body: doc(
        h2('Kūryba kaip kalba'),
        p(
          '[PAVYZDYS] Meno terapija – psichoterapijos forma, kurioje pagrindinė raiškos priemonė yra vaizdas.',
        ),
      ),
      published: true,
    },
    {
      title: 'What is art therapy?',
      excerpt:
        '[SAMPLE] A short introduction to how creativity helps express what is hard to say in words.',
      body: doc(
        h2('Creativity as a language'),
        p(
          '[SAMPLE] Art therapy is a form of psychotherapy where the image is the main means of expression.',
        ),
      ),
    },
  )
}

if (!(await payload.findGlobal({ slug: 'home', locale: 'lt' })).heroTitle) {
  await payload.updateGlobal({
    slug: 'home',
    locale: 'lt',
    data: {
      heroTitle: 'Kelionė *į vidų* prasideda nuo pirmo potėpio',
      heroLead:
        'Meno terapija – tai saugi erdvė išreikšti tai, ką sunku pasakyti žodžiais. Piešimo įgūdžių nereikia.',
      introTitle: 'Kas yra meno terapija?',
      introText:
        '[PAVYZDYS] Tai psichoterapijos forma, kurioje kūryba tampa tiltu tarp jausmų ir žodžių.',
      steps: [
        {
          title: 'Pasirinkite laiką',
          text: 'Kalendoriuje matysite laisvus laikus ir pasirinksite Jums patogų.',
        },
        {
          title: 'Užpildykite trumpą formą',
          text: 'Vardas ir el. paštas – laikas iš karto rezervuojamas Jums.',
        },
        {
          title: 'Ateikite kurti',
          text: 'Priemonės paruoštos, piešimo įgūdžių nereikia.',
        },
      ],
    },
  })
  await payload.updateGlobal({
    slug: 'home',
    locale: 'en',
    data: {
      heroTitle: 'The journey *inward* begins with the first brushstroke',
      heroLead:
        'Art therapy is a safe space to express what is hard to put into words. No drawing skills needed.',
      introTitle: 'What is art therapy?',
      introText:
        '[SAMPLE] A form of psychotherapy where creativity becomes a bridge between feelings and words.',
      steps: [
        {
          title: 'Pick a time',
          text: 'See free times in the calendar and choose one that suits you.',
        },
        {
          title: 'Fill in a short form',
          text: 'Name and email – the time is reserved for you straight away.',
        },
        {
          title: 'Come and create',
          text: 'Materials are ready, no drawing skills needed.',
        },
      ],
    },
  })
}

if (!(await payload.findGlobal({ slug: 'about', locale: 'lt' })).headline) {
  await payload.updateGlobal({
    slug: 'about',
    locale: 'lt',
    data: {
      name: '[Terapeutės vardas]',
      role: 'Meno terapeutė',
      headline: 'Sveiki, aš – Jūsų meno terapeutė',
      teaser: '[PAVYZDYS] Trumpas prisistatymas: kas esu, kaip dirbu ir kodėl meno terapija.',
      bio: doc(p('[PAVYZDYS] Čia bus Jūsų istorija, požiūris į darbą ir vertybės.')),
      credentials: [{ title: '[PAVYZDYS] Meno terapijos magistras', year: '2020' }],
    },
  })
  await payload.updateGlobal({
    slug: 'about',
    locale: 'en',
    data: {
      role: 'Art therapist',
      headline: 'Hello, I am your art therapist',
      teaser: '[SAMPLE] A short introduction: who I am, how I work and why art therapy.',
      bio: doc(p('[SAMPLE] Your story, approach and values go here.')),
      credentials: [{ title: '[SAMPLE] MA in Art Therapy', year: '2020' }],
    },
  })
}

if (!(await payload.findGlobal({ slug: 'site-settings', locale: 'lt' })).email) {
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'lt',
    data: {
      email: 'info@inward.lt',
      phone: '+370 600 00000',
      address: '[PAVYZDYS] Gatvė 1, Vilnius',
      socials: [
        { network: 'instagram', url: 'https://instagram.com/' },
        { network: 'facebook', url: 'https://facebook.com/' },
      ],
      cancellationPolicy:
        'Sesiją galite nemokamai atšaukti per nuorodą patvirtinimo laiške ne vėliau kaip likus 24 val. iki susitikimo – visa suma grąžinama. Vėliau atšaukti nebegalima.',
      privacyPolicy: doc(
        h2('[PAVYZDYS] Privatumo politika'),
        p('Čia bus privatumo politikos tekstas (BDAR).'),
      ),
    },
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      email: 'info@inward.lt',
      address: '[SAMPLE] Street 1, Vilnius',
      cancellationPolicy:
        'You can cancel free of charge via the link in your confirmation email up to 24 hours before the session – you get a full refund. Later cancellation is not possible.',
      privacyPolicy: doc(
        h2('[SAMPLE] Privacy policy'),
        p('The GDPR privacy policy text goes here.'),
      ),
    },
  })
}

const availability = await payload.findGlobal({ slug: 'availability' })
const hasHours = (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).some(
  (d) => availability[d]?.length,
)
if (!hasHours) {
  const workday = [{ from: '10:00', to: '18:00' }]
  await payload.updateGlobal({
    slug: 'availability',
    data: {
      mon: workday,
      tue: workday,
      wed: workday,
      thu: workday,
      fri: workday,
      bufferMin: 15,
      slotStepMin: 30,
      minNoticeHours: 24,
      horizonDays: 60,
    },
  })
}

payload.logger.info('seed: done')
process.exit(0)
