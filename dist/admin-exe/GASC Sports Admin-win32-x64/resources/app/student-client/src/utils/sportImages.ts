/**
 * GASC IDAPPADI SPORTS MANAGEMENT SYSTEM
 * CENTRALIZED SPORT IMAGE MAPPING - SINGLE SOURCE OF TRUTH
 *
 * ALL images sourced from: C:\Users\ELCOT\Pictures\website photo
 * Copied into: public/images/sports/
 *
 * Image -> Sport mapping is EXACT. Never interchange images.
 * Tournament images are SEPARATE from sport images.
 */

export const SPORT_IMAGES: Record<string, string> = {
  // TEAM SPORTS (Outdoor)
  cricket:       '/images/sports/cricket.png',
  football:      '/images/sports/football.png',
  volleyball:    '/images/sports/volleyball.png',
  basketball:    '/images/sports/basketball.png',
  kabaddi:       '/images/sports/kabaddi.png',
  handball:      '/images/sports/handball.png',
  throwball:     '/images/sports/throwball.png',
  hockey:        '/images/sports/hockey.png',
  kho_kho:       '/images/sports/kho_kho.png',
  khokho:        '/images/sports/kho_kho.png',

  // INDIVIDUAL SPORTS (Indoor)
  badminton:     '/images/sports/badminton.png',
  tennis:        '/images/sports/tennis.png',
  boxing:        '/images/sports/boxing.png',
  table_tennis:  '/images/sports/table_tennis.png',
  tabletennis:   '/images/sports/table_tennis.png',
  chess:         '/images/sports/chess.png',
  carrom:        '/images/sports/carrom.png',
  karate:        '/images/sports/karate.png',
  silambam:      '/images/sports/silambam.png',
  kickboxing:    '/images/sports/kickboxing.png',
  wrestling:     '/images/sports/wrestling.png',

  // ATHLETICS - TRACK EVENTS
  athletics:          '/images/sports/running_100m.png?v=3',
  running:            '/images/sports/running_100m.png?v=3',
  '100m_running':     '/images/sports/running_100m.png?v=3',
  '100m':             '/images/sports/running_100m.png?v=3',
  '100m_track_sprint':'/images/sports/running_100m.png?v=3',
  'track_sprint':     '/images/sports/running_100m.png?v=3',
  'sprint':           '/images/sports/running_100m.png?v=3',
  relay:              '/images/sports/relay.png',
  '4x100m_relay':     '/images/sports/relay.png',
  marathon:           '/images/sports/marathon.png',
  half_marathon:      '/images/sports/half_marathon.png',

  // ATHLETICS - FIELD EVENTS (JUMPS)
  long_jump:     '/images/sports/long_jump.png',
  longjump:      '/images/sports/long_jump.png',
  high_jump:     '/images/sports/high_jump.png',
  highjump:      '/images/sports/high_jump.png',
  triple_jump:   '/images/sports/triple_jump.png',
  triplejump:    '/images/sports/triple_jump.png',
  pole_vault:    '/images/sports/pole_vault.png',
  polevault:     '/images/sports/pole_vault.png',

  // ATHLETICS - FIELD EVENTS (THROWS)
  shot_put:      '/images/sports/shot_put.png',
  shotput:       '/images/sports/shot_put.png',
  discus_throw:  '/images/sports/discus_throw.png',
  discus:        '/images/sports/discus_throw.png',
  javelin_throw: '/images/sports/javelin_throw.jpg',
  javelin:       '/images/sports/javelin_throw.jpg',
  hammer_throw:  '/images/sports/hammer_throw.png',
  hammer:        '/images/sports/hammer_throw.png',

  // ATHLETICS - COMBINED EVENTS
  decathlon:     '/images/sports/decathlon.png',
  heptathlon:    '/images/sports/heptathlon.png',
};

export const normalizeSportName = (name: string = ''): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const getSportImage = (sportName: string = '', explicitImage?: string): string => {
  if (
    explicitImage &&
    explicitImage.includes('/uploads/') &&
    !explicitImage.includes('tournament') &&
    explicitImage !== 'null' &&
    explicitImage !== 'undefined'
  ) {
    return explicitImage;
  }

  const slug = normalizeSportName(sportName);

  if (slug && SPORT_IMAGES[slug]) {
    return SPORT_IMAGES[slug];
  }

  // Substring fallbacks - specific before general
  if (slug.includes('badminton'))                                      return SPORT_IMAGES.badminton;
  if (slug.includes('kabaddi'))                                        return SPORT_IMAGES.kabaddi;
  if (slug.includes('boxing'))                                         return SPORT_IMAGES.boxing;
  if (slug.includes('cricket'))                                        return SPORT_IMAGES.cricket;
  if (slug.includes('football'))                                       return SPORT_IMAGES.football;
  if (slug.includes('volleyball') || slug.includes('volley'))         return SPORT_IMAGES.volleyball;
  if (slug.includes('basketball'))                                     return SPORT_IMAGES.basketball;
  if (slug.includes('handball'))                                       return SPORT_IMAGES.handball;
  if (slug.includes('throwball') || slug.includes('throw_ball'))      return SPORT_IMAGES.throwball;
  if (slug.includes('hockey'))                                         return SPORT_IMAGES.hockey;
  if (slug.includes('kho'))                                            return SPORT_IMAGES.kho_kho;
  if (slug.includes('table_tennis') || slug.includes('tabletennis'))  return SPORT_IMAGES.table_tennis;
  if (slug.includes('tennis'))                                         return SPORT_IMAGES.tennis;
  if (slug.includes('chess'))                                          return SPORT_IMAGES.chess;
  if (slug.includes('carrom'))                                         return SPORT_IMAGES.carrom;
  if (slug.includes('karate') || slug.includes('karathe'))            return SPORT_IMAGES.karate;
  if (slug.includes('silambam'))                                       return SPORT_IMAGES.silambam;
  if (slug.includes('kickboxing'))                                     return SPORT_IMAGES.kickboxing;
  if (slug.includes('wrestling') || slug.includes('kusthi'))          return SPORT_IMAGES.wrestling;
  if (slug.includes('triple_jump') || slug.includes('triple'))        return SPORT_IMAGES.triple_jump;
  if (slug.includes('long_jump') || slug.includes('long'))            return SPORT_IMAGES.long_jump;
  if (slug.includes('high_jump') || slug.includes('high'))            return SPORT_IMAGES.high_jump;
  if (slug.includes('pole_vault') || slug.includes('pole'))           return SPORT_IMAGES.pole_vault;
  if (slug.includes('shot_put') || slug.includes('shotput'))          return SPORT_IMAGES.shot_put;
  if (slug.includes('discus'))                                         return SPORT_IMAGES.discus_throw;
  if (slug.includes('javelin'))                                        return SPORT_IMAGES.javelin_throw;
  if (slug.includes('hammer'))                                         return SPORT_IMAGES.hammer_throw;
  if (slug.includes('relay'))                                          return SPORT_IMAGES.relay;
  if (slug.includes('half_marathon') || slug.includes('half'))        return SPORT_IMAGES.half_marathon;
  if (slug.includes('marathon'))                                       return SPORT_IMAGES.marathon;
  if (slug.includes('decathlon'))                                      return SPORT_IMAGES.decathlon;
  if (slug.includes('heptathlon'))                                     return SPORT_IMAGES.heptathlon;
  if (slug.includes('running') || slug.includes('athletics') || slug.includes('sprint') || slug.includes('race') || slug.includes('100m')) {
    return SPORT_IMAGES.running;
  }

  return '/images/sports/running_100m.png?v=3';
};

export const getTournamentCoverImage = (
  _tournamentName: string = '',
  explicitBanner?: string
): string => {
  if (
    explicitBanner &&
    (explicitBanner.startsWith('/uploads/') || explicitBanner.startsWith('http')) &&
    !explicitBanner.includes('undefined') &&
    !explicitBanner.includes('null')
  ) {
    return explicitBanner;
  }
  return '/images/sports/tournament.png';
};

export const validateSportImages = (): Record<string, string> => {
  const testSports = [
    'Cricket', 'Football', 'Volleyball', 'Basketball', 'Kabaddi',
    'Badminton', 'Handball', 'Throwball', 'Tennis', 'Boxing',
    'Athletics', 'Running', 'Relay', 'Long Jump', 'High Jump',
    'Triple Jump', 'Pole Vault', 'Shot Put', 'Discus Throw',
    'Javelin Throw', 'Hammer Throw', 'Decathlon', 'Heptathlon',
    'Chess', 'Carrom', 'Table Tennis', 'Hockey', 'Kho Kho',
    'Karate', 'Silambam', 'Kickboxing', 'Wrestling', 'Marathon'
  ];
  const report: Record<string, string> = {};
  testSports.forEach(sport => {
    report[sport] = getSportImage(sport);
  });
  return report;
};
