/**
 * actions.js — Core automation actions for ServiceNow
 *
 * Each function accepts a Puppeteer Page instance and options.
 * All actions use retry() + humanDelay() for reliability.
 */
'use strict';

require('dotenv').config();

/**
 * login_servicenow — Authenticate to ServiceNow with SSO/MFA
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function login_servicenow(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: login_servicenow', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      const BASE_URL = process.env.SERVICENOW_URL;
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    const url = page.url();
    if (url.includes('/login') || url.includes('/navpage')) {
      // Native ServiceNow login
      await page.waitForSelector('#user_name, input[name="user_name"]', { timeout: 15000 });
      await page.type('#user_name', process.env.SERVICENOW_USERNAME);
      await page.type('#user_password', process.env.SERVICENOW_PASSWORD);
      await page.click('#sysverb_login, .btn-primary[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } else if (url.includes('okta') || url.includes('azure')) {
      // SSO flow
      await page.waitForSelector('#okta-signin-username, input[name="identifier"]');
      await page.type('#okta-signin-username, input[name="identifier"]', process.env.SERVICENOW_USERNAME);
      await page.click('#okta-signin-submit, [data-se="o-form-button-bar"] input');
      await page.waitForSelector('input[type="password"]');
      await page.type('input[type="password"]', process.env.SERVICENOW_PASSWORD);
      await page.click('#okta-signin-submit');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    }
    await page.waitForSelector('#nav-bar, .navpage-header, #gsft_main', { timeout: 20000 });
    return { status: 'logged_in', url: page.url() };
    } catch (err) {
      await page.screenshot({ path: `error-login_servicenow-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * create_incident — Create incidents and service requests
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function create_incident(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: create_incident', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      const BASE_URL = process.env.SERVICENOW_URL;
    await page.goto(`${BASE_URL}/nav_to.do?uri=incident.do?sys_id=-1`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#incident\.short_description, textarea[id$="short_description"]', { timeout: 15000 });
    await page.type('#incident\.short_description', opts.shortDescription || opts.title || '');
    await page.type('#incident\.description', opts.description || '');
    if (opts.urgency) await page.select('#incident\.urgency', opts.urgency);
    if (opts.impact) await page.select('#incident\.impact', opts.impact);
    if (opts.caller) {
      await page.type('input[id$="caller_id_label"]', opts.caller);
      await page.waitForSelector('.autocomplete-results li', { timeout: 5000 }).catch(() => {});
      await page.click('.autocomplete-results li:first-child').catch(() => {});
    }
    await page.click('[id$="sysverb_insert"], .btn-primary[name="sysverb_insert"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    const sysId = new URL(page.url()).searchParams.get('sys_id');
    return { status: 'created', sysId, url: page.url() };
    } catch (err) {
      await page.screenshot({ path: `error-create_incident-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * update_cmdb — Update CMDB configuration items in bulk
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function update_cmdb(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: update_cmdb', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      const BASE_URL = process.env.SERVICENOW_URL;
    await page.goto(`${BASE_URL}/cmdb_ci.do?sys_id=${opts.sysId || '-1'}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#sys_display_value, input[id*="ci_"], [class*="form-group"]', { timeout: 15000 });
    for (const [field, value] of Object.entries(opts.fields || {})) {
      const sel = `#${field}, input[name="${field}"], select[name="${field}"]`;
      const el = await page.$(sel);
      if (el) {
        const tag = await el.evaluate(e => e.tagName.toLowerCase());
        if (tag === 'select') await page.select(sel, value);
        else { await el.click({ clickCount: 3 }); await el.type(value); }
      }
    }
    await page.click('[id$="sysverb_update"], .btn-primary[name="update"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    return { status: 'updated', sysId: opts.sysId };
    } catch (err) {
      await page.screenshot({ path: `error-update_cmdb-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * assign_task — Auto-assign tasks and incidents by rules
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function assign_task(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: assign_task', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      // TODO: Replace with actual ServiceNow selectors
    // await page.goto(`${process.env.SERVICENOW_URL}/path/to/assign-task`);
    // await page.waitForSelector('.main-content, #content, [data-testid="loaded"]', { timeout: 15000 });
    const result = await page.evaluate(() => {
      return { status: 'ok', data: null };
    });
    log('assign_task complete', result);
    return result;
    } catch (err) {
      await page.screenshot({ path: `error-assign_task-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * generate_report — Export ServiceNow reports and metrics
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function generate_report(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: generate_report', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      // TODO: Replace with actual ServiceNow selectors
    // await page.goto(`${process.env.SERVICENOW_URL}/path/to/generate-report`);
    // await page.waitForSelector('.main-content, #content, [data-testid="loaded"]', { timeout: 15000 });
    const result = await page.evaluate(() => {
      return { status: 'ok', data: null };
    });
    log('generate_report complete', result);
    return result;
    } catch (err) {
      await page.screenshot({ path: `error-generate_report-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

module.exports = {
  login_servicenow,
  create_incident,
  update_cmdb,
  assign_task,
  generate_report,
};
