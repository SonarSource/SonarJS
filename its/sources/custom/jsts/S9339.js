/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute this program and/or modify it under the terms of
 * the Sonar Source-Available License as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE, either express or implied.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import axios from 'axios';

const requests = axios.all([axios.get('/a'), axios.get('/b')]);
const handler = axios.spread((left, right) => left + right);
const source = axios.CancelToken.source();
const response = axios.get('/user', { cancelToken: source.token });
source.cancel();

export { handler, requests, response };
