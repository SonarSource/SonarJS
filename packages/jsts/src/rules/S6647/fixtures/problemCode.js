/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
class FakeWebChannel extends EventTarget {
  /**
   * @param {!WebChannel.MessageData} messageData
   * @override
   */
  constructor(messageData) {
    super();

    /** @private {?boolean} */
    this.open_ = null;

    /** @private @const {!Array<!WebChannel.MessageData>} */
    this.messages_ = [];
  }
}
