/**
 * ============================================================================
 * KAHAN CHAL RAHA HAI? (local dev vs hosted)
 * ============================================================================
 *
 * Live Vercel backend NODE_ENV=development ke saath chal raha tha, jis se rate
 * limiter band, CORS sab origins ke liye khula, aur error me stack trace bahar ja
 * raha tha. Ab "development" ki dheel sirf developer ki apni machine par milti hai:
 * Vercel (jo har deployment me VERCEL=1 set karta hai) par NODE_ENV kuch bhi ho,
 * hifazati qaide lagte hain.
 *
 * Har call par process.env padha jata hai (tests env badal kar check kar sakte hain).
 */

const nodeEnv = () => process.env.NODE_ENV || 'development';

/** Vercel jaisi hosted jagah (sirf NODE_ENV par bharosa nahi) */
const isHostedDeployment = () => Boolean(process.env.VERCEL);

/** Developer ki apni machine par development — sirf yahan dheel (stack, no rate limit, open CORS) */
const isLocalDevelopment = () => nodeEnv() === 'development' && !isHostedDeployment();

const isTest = () => nodeEnv() === 'test';

module.exports = { nodeEnv, isHostedDeployment, isLocalDevelopment, isTest };
