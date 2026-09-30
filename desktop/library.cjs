'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const Proof = require('../extension/report.js');

const MAX_REPORT_BYTES = 1024 * 1024;
const MAX_LIBRARY_BYTES = 20 * 1024 * 1024;
const MAX_SESSIONS = 40;

function parseReport(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_REPORT_BYTES) {
    throw new Error('Choose a NudgeProof JSON report smaller than 1 MB.');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Export a NudgeProof report from the browser.');
  }
  return Proof.normalize(parsed);
}

class Library {
  constructor(directory) {
    this.directory = directory;
    this.file = path.join(directory, 'audit-library.json');
    this.state = { version: 1, sessions: [], exports: [] };
    this.warning = '';
  }

  async load() {
    try {
      const stat = await fs.stat(this.file);
      if (stat.size > MAX_LIBRARY_BYTES) throw new Error('Library size limit exceeded.');
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (
        parsed.version !== 1 ||
        !Array.isArray(parsed.sessions) ||
        parsed.sessions.length > MAX_SESSIONS
      ) {
        throw new Error('Invalid library.');
      }
      const sessions = parsed.sessions.map((entry) => {
        if (!Number.isFinite(Date.parse(entry.importedAt))) throw new Error('Invalid import date.');
        return { report: parseReport(JSON.stringify(entry.report)), importedAt: entry.importedAt };
      });
      if (new Set(sessions.map((item) => item.report.sessionId)).size !== sessions.length) {
        throw new Error('Duplicate session identifiers.');
      }
      const exports = Array.isArray(parsed.exports)
        ? parsed.exports
            .filter((date) => typeof date === 'string' && Number.isFinite(Date.parse(date)))
            .slice(-500)
        : [];
      this.state = { version: 1, sessions, exports };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.warning =
          'The saved audit library could not be read. It has been left untouched. Reopen a backup or clear the local library in Settings before importing.';
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return structuredClone({
      ...this.state,
      warning: this.warning,
      limit: MAX_SESSIONS,
      location: this.file,
    });
  }

  async save(next) {
    if (this.warning) throw new Error(this.warning);
    const text = JSON.stringify(next, null, 2);
    if (Buffer.byteLength(text) > MAX_LIBRARY_BYTES)
      throw new Error(
        'The local library is full. Export reports you want to keep, then clear the library in Settings.',
      );
    await fs.mkdir(this.directory, { recursive: true });
    const temporary = `${this.file}.tmp`;
    await fs.writeFile(temporary, text, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temporary, this.file);
    this.state = next;
  }

  async importReport(report, { replace = false } = {}) {
    const safeReport = parseReport(JSON.stringify(report));
    const next = structuredClone(this.state);
    const existing = next.sessions.findIndex(
      (entry) => entry.report.sessionId === safeReport.sessionId,
    );
    if (
      existing >= 0 &&
      JSON.stringify(next.sessions[existing].report) === JSON.stringify(safeReport)
    ) {
      return { sessionId: safeReport.sessionId, unchanged: true, state: this.snapshot() };
    }
    if (existing >= 0 && !replace) {
      throw new Error(
        'A different snapshot of this session is already saved. Confirm replacement before changing its evidence.',
      );
    }
    const entry = { report: safeReport, importedAt: new Date().toISOString() };
    if (existing >= 0) next.sessions[existing] = entry;
    else {
      if (next.sessions.length >= MAX_SESSIONS)
        throw new Error(
          'The workspace holds 40 sessions. Export reports you want to keep, then clear the local library in Settings.',
        );
      next.sessions.unshift(entry);
    }
    await this.save(next);
    return { sessionId: safeReport.sessionId, replaced: existing >= 0, state: this.snapshot() };
  }

  get(sessionId) {
    if (typeof sessionId !== 'string') throw new Error('Select an audit session first.');
    const entry = this.state.sessions.find((item) => item.report.sessionId === sessionId);
    if (!entry) throw new Error('That audit session is no longer in this workspace.');
    return structuredClone(entry.report);
  }

  async recordExport() {
    const next = structuredClone(this.state);
    next.exports = [...next.exports, new Date().toISOString()].slice(-500);
    await this.save(next);
  }

  async clear() {
    const previousWarning = this.warning;
    this.warning = '';
    try {
      await this.save({ version: 1, sessions: [], exports: [] });
    } catch (error) {
      this.warning = previousWarning;
      throw error;
    }
    return this.snapshot();
  }
}

module.exports = { Library, parseReport, MAX_REPORT_BYTES, MAX_LIBRARY_BYTES, MAX_SESSIONS };
