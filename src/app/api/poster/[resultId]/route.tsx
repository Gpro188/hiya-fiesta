import { ImageResponse } from 'next/og';
import { PrismaClient } from '@prisma/client';

// Removed edge runtime due to Vercel 1MB size limit with Prisma


const prisma = new PrismaClient();

export async function GET(request: Request, context: { params: Promise<{ resultId: string }> }) {
  try {
    const { resultId } = await context.params;
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        candidate: { include: { team: true } },
        team: true,
        program: { include: { category: true } }
      }
    });

    const settings = await prisma.globalSetting.findUnique({
      where: { id: 'default' }
    });

    if (!result || !result.isPublished) {
      return new Response('Poster not found or result not published', { status: 404 });
    }

    const winnerName = result.candidate?.name || result.team?.name || 'Winner';
    const teamName = result.candidate?.team.name || result.team?.name || 'Team';

    const bgImage = settings?.posterBgUrl || 'https://placehold.co/1080x1080/0F172A/FFF?text=Winner';

    const textColor = settings?.posterTextColor || 'white';
    const primaryColor = settings?.posterPrimaryColor || '#FCD34D';
    const secondaryColor = settings?.posterSecondaryColor || '#4F46E5';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            paddingBottom: '120px',
            color: textColor,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Overlay gradient for readability */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
            display: 'flex'
          }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            <h1 style={{ 
              fontSize: '80px', 
              fontWeight: 800, 
              margin: '0 0 20px 0', 
              textTransform: 'uppercase', 
              letterSpacing: '2px',
              textShadow: '0 4px 10px rgba(0,0,0,0.5)'
            }}>
              {winnerName}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '40px', fontWeight: 600, color: primaryColor, marginRight: '20px' }}>
                {result.rank === 1 ? '1ST PLACE' : result.rank === 2 ? '2ND PLACE' : result.rank === 3 ? '3RD PLACE' : `${result.grade} GRADE`}
              </span>
              <span style={{ fontSize: '30px', background: secondaryColor, padding: '5px 20px', borderRadius: '50px', color: textColor }}>
                {teamName}
              </span>
            </div>
            
            <p style={{ fontSize: '35px', margin: 0, opacity: 0.9 }}>
              {result.program.name} ({result.program.category?.name || 'General'})
            </p>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
