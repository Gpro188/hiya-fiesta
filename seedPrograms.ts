import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Get or create the main event
  let event = await prisma.event.findFirst({
    where: { parentId: null }
  });
  
  if (!event) {
    event = await prisma.event.create({
      data: {
        name: "CSWC Hiya Fiesta 2026",
      }
    });
  }

  // 2. Create Categories
  const categoryNames = ["FADHILA", "FADHEELA", "GENERAL"];
  const categories: Record<string, string> = {};

  for (const name of categoryNames) {
    let cat = await prisma.category.findFirst({
      where: { name, eventId: event.id }
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name, eventId: event.id }
      });
    }
    categories[name] = cat.id;
  }

  // 3. Define Programs
  const programs = [
    // FADHILA - Stage
    { name: "Qiraa't", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Hifz", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Speech Malayalam/Kannada", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL", description: "See syllabus for topics" },
    { name: "Speech English", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL", description: "Topics: Ideal woman in islam, Science and quran" },
    { name: "Islamic Song Malayalam/Kannada", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Arabic Song", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Word Puzzle English", category: "FADHILA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    // FADHILA - Off-Stage
    { name: "Essay Malayalam/Kannada", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Essay English", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Story Writing Malayalam/Kannada", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Short Story Writing English", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Translation - Arabic - English", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Vocabulary", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Pencil Drawing", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Calligraphy", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Footnote making", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Digital Poster Making", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Bottle Art", category: "FADHILA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },

    // FADHEELA - Stage
    { name: "Qiraa't", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Hifz", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Speech Malayalam/Kannada", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Speech English", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL", description: "Topics: Faith over fame: redefining success, Finance in islam" },
    { name: "Speech Arabic", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL", description: "See syllabus for topics" },
    { name: "Islamic song Malayalam/Kannada", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Arabic Song", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Word Puzzle Arabic", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    { name: "Daleel", category: "FADHEELA", stageType: "ON_STAGE", type: "INDIVIDUAL" },
    // FADHEELA - Off-Stage
    { name: "Essay Malayalam/Kannada", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Essay English", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Short Story Writing English", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Story Writing Arabic", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Translation (English - Arabic)", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Digital Poster Making", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Calligraphy", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Haiku", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Bottle Art", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "Crochet knitting", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },
    { name: "AI prompting", category: "FADHEELA", stageType: "OFF_STAGE", type: "INDIVIDUAL" },

    // GENERAL
    { name: "Mashup", category: "GENERAL", stageType: "ON_STAGE", type: "GROUP" },
    { name: "Burdha Qawali", category: "GENERAL", stageType: "ON_STAGE", type: "GROUP" },
    { name: "Magazine", category: "GENERAL", stageType: "OFF_STAGE", type: "GROUP" },
    { name: "Quiz", category: "GENERAL", stageType: "ON_STAGE", type: "GROUP" },
    { name: "Live translation English to Arabic", category: "GENERAL", stageType: "ON_STAGE", type: "GROUP" },
    { name: "Startup pitch", category: "GENERAL", stageType: "ON_STAGE", type: "GROUP" },
  ];

  let codeCounter = 1;
  for (const prog of programs) {
    const exists = await prisma.program.findFirst({
      where: { name: prog.name, categoryId: categories[prog.category], eventId: event.id }
    });

    if (!exists) {
      await prisma.program.create({
        data: {
          programCode: `P${codeCounter.toString().padStart(3, '0')}`,
          name: prog.name,
          type: prog.type,
          categoryId: categories[prog.category],
          eventId: event.id,
          stageType: prog.stageType,
          description: prog.description || "",
        }
      });
      console.log(`Created: ${prog.name} (${prog.category})`);
      codeCounter++;
    } else {
      console.log(`Already exists: ${prog.name} (${prog.category})`);
    }
  }

  console.log("Done seeding programs");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
