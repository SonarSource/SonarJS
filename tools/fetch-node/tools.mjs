/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as url from 'url';
import * as path from 'path';
// replace __dirname in module
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * The local cache for node distributions
 */
export const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

export const RUNTIMES_DIR = path.join(__dirname, 'downloads', 'runtimes');

/**
 * Removes the file extension from the archive
 *
 * @param {*} filename
 * @returns
 */
export const removeExtension = function removeExtension(filename) {
  let extensionLength;
  if (filename.endsWith('.zip')) {
    extensionLength = 4;
  } else if (filename.endsWith('.tar.xz') || filename.endsWith('.tar.gz')) {
    extensionLength = 7;
  } else {
    throw new Error(
      `File extension removal not supported for file: ${filename}. Please implement for its extension`,
    );
  }
  return filename.slice(0, -extensionLength);
};

/**
 * Retrieves the last part of a URL path
 *
 * @param url
 * @returns {*}
 */
export const getFilenameFromUrl = function getFilenameFromUrl(url) {
  const parts = url.split('/');
  return parts[parts.length - 1];
};
