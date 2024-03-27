/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { AddressInfo } from 'net';
import http from 'http';

/**
 * Sends an HTTP request to a server's endpoint running on localhost.
 */
export async function request(server: http.Server, path: string, method: string, body: any = {}) {
  return await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method,
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  }).then(response => response.text());
}
