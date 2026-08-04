// Copyright 2026 The Closure Library Authors. All Rights Reserved.
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
import lodash from 'lodash';
import underscore from 'underscore';

const user = { address: { city: 'Bern' } };
const address = user.address;

const lodashCopy = lodash.clone(user);
lodashCopy.address.city = 'Geneva';

const underscoreCopy = underscore.clone(user);
underscoreCopy.address.city = 'Geneva';

const deepCopy = structuredClone(user);
deepCopy.address.city = 'Geneva';

const topLevelCopy = lodash.clone(user);
topLevelCopy.address = address;
