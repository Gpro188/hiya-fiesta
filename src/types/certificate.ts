export interface CertificateFieldConfig {
  id: string;
  name: string;
  enabled: boolean;
  top: number; // percentage from top (0-100)
  left: number; // percentage from left (0-100)
  width?: number; // percentage max-width (0-100)
  fontSize: number; // in pixels (e.g. 24)
  fontWeight: '400' | '500' | '600' | '700' | '800';
  fontFamily: 'Neulis, sans-serif' | 'Neulis Alt, sans-serif' | 'Fraunces, serif' | 'Cinzel, serif' | 'Playfair Display, serif' | 'Inter, sans-serif' | 'Times New Roman, serif' | 'Georgia, serif' | 'Arial, sans-serif' | (string & {});
  color: string; // hex color e.g. '#0f172a'
  textAlign: 'left' | 'center' | 'right';
  letterSpacing?: number; // in px
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  prefix?: string; // e.g. "With "
  suffix?: string; // e.g. " Grade"
  formatType?: string; // for place: 'ordinal' (1st Place) | 'word' (First Place) | 'number' (1st)
}

export interface CertificateLayoutConfig {
  id?: string;
  orientation: 'landscape' | 'portrait';
  paperSize: 'A4' | 'A3';
  templateImageUrl: string;
  printMode: 'transparent' | 'full'; // 'transparent' = text only for pre-printed stock; 'full' = with template bg
  globalOffsetX: number; // mm
  globalOffsetY: number; // mm
  fields: {
    candidateName: CertificateFieldConfig;
    place: CertificateFieldConfig;
    grade: CertificateFieldConfig;
    programName: CertificateFieldConfig;
    categoryName: CertificateFieldConfig;
    institutionName: CertificateFieldConfig;
    chestNumber: CertificateFieldConfig;
    zoneName: CertificateFieldConfig;
    dateYear: CertificateFieldConfig;
  };
}

export interface CertificateWinner {
  id: string;
  resultId?: string;
  candidateId?: string;
  candidateName: string;
  chestNumber: string;
  institutionName: string;
  institutionPlace?: string;
  teamName?: string;
  programId: string;
  programName: string;
  programCode?: string;
  categoryId?: string;
  categoryName: string;
  rank: number; // 1, 2, or 3
  placeText: string; // e.g. "1st Place" or "First Place"
  grade?: string | null; // "A", "B", "C" or null
  gradeText?: string | null; // "A Grade" or null
  zoneId?: string;
  zoneName?: string;
  eventId: string;
  eventName: string;
  marks?: number;
  type: 'INDIVIDUAL' | 'GROUP';
  stageType?: string; // "ON_STAGE" | "OFF_STAGE"
  isPublished?: boolean;
  publishedAt?: string | null;
  isPrinted?: boolean;
  printedAt?: string | null;
}

export const DEFAULT_CERTIFICATE_LAYOUT: CertificateLayoutConfig = {
  orientation: 'landscape',
  paperSize: 'A4',
  templateImageUrl: '',
  printMode: 'transparent', // Default to transparent for printing directly onto pre-printed certificates
  globalOffsetX: 0,
  globalOffsetY: 0,
  fields: {
    candidateName: {
      id: 'candidateName',
      name: 'Candidate / Team Name',
      enabled: true,
      top: 42,
      left: 50,
      width: 75,
      fontSize: 32,
      fontWeight: '700',
      fontFamily: 'Fraunces, serif',
      color: '#0f172a',
      textAlign: 'center',
      letterSpacing: 0.5,
      textTransform: 'capitalize',
    },
    institutionName: {
      id: 'institutionName',
      name: 'College / Institution',
      enabled: true,
      top: 50,
      left: 50,
      width: 80,
      fontSize: 20,
      fontWeight: '500',
      fontFamily: 'Inter, sans-serif',
      color: '#334155',
      textAlign: 'center',
      textTransform: 'none',
    },
    place: {
      id: 'place',
      name: 'Place (1st, 2nd, 3rd)',
      enabled: true,
      top: 58,
      left: 38,
      width: 30,
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Fraunces, serif',
      color: '#0f172a',
      textAlign: 'center',
      formatType: 'ordinal', // 1st Place
    },
    grade: {
      id: 'grade',
      name: 'Grade (With A Grade)',
      enabled: true,
      top: 58,
      left: 64,
      width: 25,
      fontSize: 22,
      fontWeight: '600',
      fontFamily: 'Inter, sans-serif',
      color: '#0f172a',
      textAlign: 'center',
      prefix: 'With ',
      suffix: ' Grade',
    },
    programName: {
      id: 'programName',
      name: 'Program Name',
      enabled: true,
      top: 66,
      left: 50,
      width: 70,
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Fraunces, serif',
      color: '#0f172a',
      textAlign: 'center',
    },
    categoryName: {
      id: 'categoryName',
      name: 'Category (Fadhila/Fadheela/General)',
      enabled: true,
      top: 73,
      left: 50,
      width: 50,
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Inter, sans-serif',
      color: '#475569',
      textAlign: 'center',
      prefix: '',
    },
    chestNumber: {
      id: 'chestNumber',
      name: 'Chest Number',
      enabled: true,
      top: 35,
      left: 85,
      width: 20,
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Inter, sans-serif',
      color: '#64748b',
      textAlign: 'center',
      prefix: 'Chest: ',
    },
    zoneName: {
      id: 'zoneName',
      name: 'Zone / Fest Title',
      enabled: true,
      top: 80,
      left: 30,
      width: 35,
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Inter, sans-serif',
      color: '#475569',
      textAlign: 'left',
    },
    dateYear: {
      id: 'dateYear',
      name: 'Date / Year',
      enabled: true,
      top: 80,
      left: 70,
      width: 25,
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Inter, sans-serif',
      color: '#64748b',
      textAlign: 'right',
    },
  },
};
