const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updates = [
    {
      codes: ['1', '19'],
      duration: 3,
      description: 'ഫാളില - സൂറത്തുൽ നൂർ\nഫളീല - സൂറത്തുൽ മർയം',
      evaluationCriteria: 'ഉച്ചാരണ ശുദ്ധി, തജ്‌വീദ് നിയമങ്ങൾ, ശൈലി, ശബ്ദ ഭംഗി'
    },
    {
      codes: ['2', '20'],
      duration: 5,
      description: 'ഫാളില: മുൽക്, യാസീൻ സൂറത്തുകളും അൽ അഅ്‌ലാ സൂറത്ത് മുതൽ നാസ് വരെയും\nഫളീല: വാഖിഅ, സജദ, ദുഖാൻ എന്നീ സൂറത്തുകളും',
      evaluationCriteria: 'മനപ്പാഠം, ഉച്ചാരണ ശുദ്ധി, തജ്‌വീദ് നിയമങ്ങൾ, ശൈലി, ശബ്ദ ഭംഗി.'
    },
    {
      codes: ['3', '4'],
      duration: 5,
      descriptionAppend: '\n\nനിർദ്ദേശങ്ങൾ:\nഫാളില Malayalam / Kannada, English എന്നീ ഭാഷകളിലും ഫളീല Arabic, English ഭാഷകളിലും നൽകിയിരിക്കുന്ന രണ്ട് വിഷയങ്ങളിലും മത്സരാർത്ഥി തയ്യാറാകേണ്ടതാണ്. മത്സരം ആരംഭിക്കുന്നതിന് മുമ്പായി ലോട്ടിലൂടെ തിരഞ്ഞെടുക്കുന്ന വിഷയമാണ് അവതരിപ്പിക്കേണ്ടത്. ഫളീല മലയാള പ്രസംഗ മത്സര വിഷയം മത്സരത്തിന് അര മണിക്കൂർ മുമ്പ് നൽകപ്പെടുന്നതാണ്.',
      evaluationCriteria: 'വിഷയ ബന്ധം, ആശയ പൂർണ്ണത, സ്ഫുടത, ഭാഷാ ശുദ്ധി, ഉദാഹരണങ്ങളുടെയും തെളിവുകളുടെയും പിൻബലം, ശൈലി, ശരീര ഭാഷ, ശബ്ദ വിന്യാസം.'
    },
    {
      codes: ['21', '22', '23'],
      duration: 8,
      descriptionAppend: '\n\nനിർദ്ദേശങ്ങൾ:\nഫാളില Malayalam / Kannada, English എന്നീ ഭാഷകളിലും ഫളീല Arabic, English ഭാഷകളിലും നൽകിയിരിക്കുന്ന രണ്ട് വിഷയങ്ങളിലും മത്സരാർത്ഥി തയ്യാറാകേണ്ടതാണ്. മത്സരം ആരംഭിക്കുന്നതിന് മുമ്പായി ലോട്ടിലൂടെ തിരഞ്ഞെടുക്കുന്ന വിഷയമാണ് അവതരിപ്പിക്കേണ്ടത്. ഫളീല മലയാള പ്രസംഗ മത്സര വിഷയം മത്സരത്തിന് അര മണിക്കൂർ മുമ്പ് നൽകപ്പെടുന്നതാണ്.',
      evaluationCriteria: 'വിഷയ ബന്ധം, ആശയ പൂർണ്ണത, സ്ഫുടത, ഭാഷാ ശുദ്ധി, ഉദാഹരണങ്ങളുടെയും തെളിവുകളുടെയും പിൻബലം, ശൈലി, ശരീര ഭാഷ, ശബ്ദ വിന്യാസം.'
    }
  ];

  let updatedCount = 0;

  for (const update of updates) {
    for (const code of update.codes) {
      const allPrograms = await prisma.program.findMany({
        where: { programCode: code }
      });
      
      for (const existing of allPrograms) {
        // Skip if already has this exact evaluation criteria to avoid double appending description
        if (existing.evaluationCriteria === update.evaluationCriteria) continue;

        let newDescription = existing.description || '';
        if (update.description) {
           newDescription = update.description;
        } else if (update.descriptionAppend) {
           newDescription = newDescription + update.descriptionAppend;
        }

        await prisma.program.update({
          where: { id: existing.id },
          data: {
            duration: update.duration,
            description: newDescription,
            evaluationCriteria: update.evaluationCriteria
          }
        });
        updatedCount++;
      }
    }
  }

  console.log('Total child programs updated across all zones/states: ' + updatedCount);
}

main();
