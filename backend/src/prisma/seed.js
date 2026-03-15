// ─── Database Seed ────────────────────────────────────────────────────────────
// Run: node src/prisma/seed.js
// Seeds default global message templates visible to all teachers.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const DEFAULT_TEMPLATES = [
  {
    title: 'Initial inquiry reply',
    channel: 'WHATSAPP',
    category: 'NURTURE',
    sortOrder: 1,
    body: `Namaste {Name}! 🙏

Thank you for your interest in the Happiness Program.

I'm {TeacherName}, an Art of Living teacher. Let me share everything you need to know — takes just 2 minutes.

Quick question: are you looking to manage stress, sleep better, or find more inner peace?`,
  },
  {
    title: 'Course introduction',
    channel: 'WHATSAPP',
    category: 'NURTURE',
    sortOrder: 2,
    body: `The *Happiness Program* is a 5-day course that teaches Sudarshan Kriya — a powerful breathing technique backed by 100+ scientific studies.

✅ Reduce stress by 56% (Stanford study)
✅ Better sleep quality  
✅ More energy and mental clarity
✅ Techniques you use for life

50 million+ people in 180 countries have done this. 🌍

The next course in {City} is on *{CourseDate}*.`,
  },
  {
    title: 'Testimonial message',
    channel: 'WHATSAPP',
    category: 'TESTIMONIAL',
    sortOrder: 3,
    body: `Here's what a participant from {City} shared after the course:

_"I was skeptical at first. By Day 3, I slept 8 hours straight for the first time in years. My anxiety reduced so much. Best investment I've ever made in myself."_

Would you like to hear more stories? 🙂`,
  },
  {
    title: 'Handle objections',
    channel: 'WHATSAPP',
    category: 'NURTURE',
    sortOrder: 4,
    body: `Common questions I get:

❓ *"Is it religious?"* → Not at all. Science-based wellness for everyone.
❓ *"I'm too busy"* → 2–3 hrs/day for 5 days. Most say it's worth every minute.
❓ *"Does it work?"* → 50M participants, 180 countries.
❓ *"What's the cost?"* → Registration link has all details.

Any other questions? Happy to chat 😊`,
  },
  {
    title: 'Registration link + urgency',
    channel: 'WHATSAPP',
    category: 'NURTURE',
    sortOrder: 5,
    body: `The next Happiness Program in *{City}* is on *{CourseDate}*.

📌 Register here: {OrgLink}

⚡ Seats are limited — this batch fills up fast.

Once you register, I'll add you to the participant group with all course details!

Looking forward to seeing you there 🙏 — {TeacherName}`,
  },
  {
    title: '7-day pre-course reminder',
    channel: 'WHATSAPP',
    category: 'REMINDER',
    sortOrder: 6,
    body: `Hi {Name} 🙏 Just a friendly reminder — the Happiness Program in {City} starts in *7 days* ({CourseDate})!

Have you registered yet? 

📌 {OrgLink}

Any questions? I'm here to help!`,
  },
  {
    title: '3-day pre-course reminder',
    channel: 'WHATSAPP',
    category: 'REMINDER',
    sortOrder: 7,
    body: `{Name}, only *3 days left* to register for the Happiness Program! 🔥

A few seats just got taken. Don't miss this one —

📌 {OrgLink}

Course date: *{CourseDate}* in {City}`,
  },
  {
    title: 'Final reminder (1 day before)',
    channel: 'WHATSAPP',
    category: 'REMINDER',
    sortOrder: 8,
    body: `Last chance, {Name}! 🙏

The Happiness Program starts *tomorrow* in {City}. If you've been thinking about it — this is your sign.

📌 {OrgLink}

See you there! 🌟 — {TeacherName}`,
  },
  {
    title: 'Course completion + community invite',
    channel: 'WHATSAPP',
    category: 'POST_COURSE',
    sortOrder: 9,
    body: `Congratulations on completing the Happiness Program, {Name}! 🎉

You've taken a powerful step towards a more joyful, peaceful life.

🙏 You are now part of the Art of Living family — a community of millions who have chosen inner freedom.

I'm adding you to our community group now. You'll receive daily SK reminders and weekly wisdom there. 🌱`,
  },
  {
    title: 'Daily SK practice reminder',
    channel: 'WHATSAPP',
    category: 'POST_COURSE',
    sortOrder: 10,
    body: `Good morning! 🌅

Time for your Sudarshan Kriya practice. Even 20 minutes will transform your entire day.

Remember: consistency creates transformation. You've got this! 🙏

— {TeacherName}`,
  },
  // ── EMAIL TEMPLATES ──────────────────────────────────────────────────────
  {
    title: 'Email: Happiness Program invitation',
    channel: 'EMAIL',
    category: 'ANNOUNCEMENT',
    sortOrder: 11,
    subject: 'You\'re invited: Happiness Program in {City} — {CourseDate}',
    body: `Dear {Name},

I hope this message finds you well!

I wanted to personally invite you to the *Happiness Program* — a 5-day transformative course by Art of Living, coming to {City} on {CourseDate}.

What is the Happiness Program?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Happiness Program teaches Sudarshan Kriya, a unique breathing technique that has helped over 50 million people in 180 countries experience:

• Significant reduction in stress and anxiety
• Better, deeper sleep
• Increased energy and mental clarity  
• A profound sense of inner peace

All of these benefits are backed by 100+ scientific studies including research from Stanford, Harvard, and Yale.

Register Here: {OrgLink}

Feel free to reply to this email with any questions. I would love to have you join us!

With warm regards,
{TeacherName}
Art of Living Teacher`,
  },
  {
    title: 'Email: 7-day reminder',
    channel: 'EMAIL',
    category: 'REMINDER',
    sortOrder: 12,
    subject: 'Reminder: Happiness Program in {City} — just 7 days away!',
    body: `Dear {Name},

Just a friendly reminder that the Happiness Program in {City} begins on {CourseDate} — just 7 days from now!

If you haven't registered yet, please do so soon as seats are limited:

Register: {OrgLink}

Looking forward to seeing you there!

Warm regards,
{TeacherName}`,
  },
];

async function main() {
  console.log('🌱 Seeding default message templates...');

  for (const template of DEFAULT_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: {
        // Create a stable ID based on title so re-runs are idempotent
        id: Buffer.from(template.title).toString('base64').slice(0, 25).replace(/[^a-zA-Z0-9]/g, ''),
      },
      update: template,
      create: {
        id: Buffer.from(template.title).toString('base64').slice(0, 25).replace(/[^a-zA-Z0-9]/g, ''),
        teacherId: null,  // Global — visible to all
        isShared: true,
        isActive: true,
        ...template,
      },
    });
  }

  console.log(`✅ Seeded ${DEFAULT_TEMPLATES.length} default templates`);
  console.log('🎉 Database seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
