const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EVENT_ID = 'fe25800f-6b74-4509-86e7-f0395e8cdb81';
const FADHILA_CAT_ID = '20b82e9c-bb20-48af-afd7-7ab9b8b0a9e0';
const FADHEELA_CAT_ID = 'e65f681b-d797-4318-a75a-52f9bef7407d';

const programs = [
  { programCode: '1', name: 'Qiraa\'t', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '2', name: 'Hifz', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '3', name: 'Speech Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: '• ??????? ????????? ??????????\n• ???? ??????????? ?????' },
  { programCode: '4', name: 'Speech English', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: '• Ideal woman in islam\n• Science and quran' },
  { programCode: '5', name: 'Islamic Song Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '6', name: 'Arabic Song', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '7', name: 'Word Puzzle English', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '8', name: 'Essay Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '9', name: 'Essay English', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '10', name: 'Story Writing Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '11', name: 'Short Story Writing English', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '12', name: 'Translation - Arabic - English', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '13', name: 'Vocabulary', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '14', name: 'Pencil Drawing', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '15', name: 'Calligraphy', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '16', name: 'Footnote making', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '17', name: 'Digital Poster Making', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '18', name: 'Bottle Art', type: 'INDIVIDUAL', categoryId: FADHILA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '19', name: 'Qiraa\'t', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '20', name: 'Hifz', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '21', name: 'Speech Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '22', name: 'Speech English', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: '• Faith over fame: redefining success\n• Finance in islam' },
  { programCode: '23', name: 'Speech Arabic', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: '• ????? ??????? ????????? ??? ?????? ??????\n• ?????? ??????? ???? ???? ??? ?????? ???????? ?????????' },
  { programCode: '24', name: 'Islamic song Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '25', name: 'Arabic Song', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '26', name: 'Word Puzzle Arabic', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '27', name: 'Daleel', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '28', name: 'Essay Malayalam/Kannada', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '29', name: 'Essay English', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '30', name: 'Short Story Writing English', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '31', name: 'Story Writing Arabic', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '32', name: 'Translation (English - Arabic)', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '33', name: 'Digital Poster Making', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '34', name: 'Calligraphy', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '35', name: 'Haiku', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '36', name: 'Bottle Art', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '37', name: 'Crochet knitting', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '38', name: 'AI prompting', type: 'INDIVIDUAL', categoryId: FADHEELA_CAT_ID, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '39', name: 'Mashup', type: 'GENERAL', categoryId: null, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '40', name: 'Quiz', type: 'GENERAL', categoryId: null, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '41', name: 'Burdha Qawali', type: 'GENERAL', categoryId: null, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '42', name: 'Live translation English to Arabic', type: 'GENERAL', categoryId: null, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
  { programCode: '43', name: 'Magazine', type: 'GENERAL', categoryId: null, eventId: EVENT_ID, stageType: 'OFF_STAGE', description: null },
  { programCode: '44', name: 'Startup pitch', type: 'GENERAL', categoryId: null, eventId: EVENT_ID, stageType: 'ON_STAGE', description: null },
];

async function main() {
  const result = await prisma.program.createMany({
    data: programs
  });
  console.log('Programs inserted:', result.count);
}
main();
