/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { AddressInfo } from 'net';
import http from 'http';

export type BridgeResponseType = 'text' | 'formdata';

/**
 * Sends an HTTP request to a server's endpoint running on localhost.
 */
export async function request(server: http.Server, path: string, method: string, body: any = {}) {
  const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method,
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });

  const contentTypeHeader = res.headers.get('Content-Type');

  if (contentTypeHeader?.includes('multipart/form-data')) {
    return res.formData();
  } else {
    return res.text();
  }
}
