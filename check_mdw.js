const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { username: 'mdw' } });
    console.log('MDW User:', user);
    
    if (user && user.institutionId && user.eventId) {
        const team = await prisma.team.findFirst({
            where: {
                institutionId: user.institutionId,
                eventId: user.eventId
            }
        });
        console.log('MDW Team:', team);
    }
}
main();
