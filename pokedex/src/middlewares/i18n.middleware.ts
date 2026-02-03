/**
 * Internationalization (i18n) Middleware
 * Handles language detection and sets i18n context for requests
 */

import { Request, Response, NextFunction } from 'express';
import {
  I18nService,
  SupportedLocale,
  parseAcceptLanguage,
  isLocaleSupported,
  getDefaultLocale,
} from '../services/i18n.service';

// Extend Express Request to include i18n
declare global {
  namespace Express {
    interface Request {
      i18n: I18nService;
      locale: SupportedLocale;
    }
  }
}

/**
 * Detect locale from multiple sources in order of priority:
 * 1. Query parameter (?lang=en)
 * 2. Cookie (locale)
 * 3. Accept-Language header
 * 4. Default locale
 */
function detectLocale(req: Request): SupportedLocale {
  // 1. Query parameter
  const queryLang = req.query.lang as string | undefined;
  if (queryLang && isLocaleSupported(queryLang)) {
    return queryLang;
  }

  // 2. Cookie
  const cookieLang = req.cookies?.locale as string | undefined;
  if (cookieLang && isLocaleSupported(cookieLang)) {
    return cookieLang;
  }

  // 3. Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  return parseAcceptLanguage(acceptLanguage);
}

/**
 * I18n Middleware
 * Adds i18n service and locale to request object
 * Sets locale cookie when changed via query parameter
 */
export function i18nMiddleware(req: Request, res: Response, next: NextFunction): void {
  const locale = detectLocale(req);
  const i18n = new I18nService(locale);

  // Attach to request
  req.i18n = i18n;
  req.locale = locale;

  // Make translations available in all views
  res.locals.i18n = i18n;
  res.locals.t = i18n.getMessages();
  res.locals.locale = locale;
  res.locals.htmlLang = i18n.getHtmlLang();

  // Set cookie if changed via query parameter
  if (req.query.lang && isLocaleSupported(req.query.lang as string)) {
    res.cookie('locale', req.query.lang, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  next();
}

export default i18nMiddleware;
