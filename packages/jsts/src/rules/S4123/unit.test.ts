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
import { TypeScriptRuleTester } from '../tools';
import { rule } from './';
const ruleTester = new TypeScriptRuleTester();
ruleTester.run('await should only be used with promises.', rule, {
  valid: [
    {
      code: `
      /**
       * Saves the current vuegg project definition in the specify repository
       *
       * @param  {object} project : Project definition to be saved in the repository (as vue.gg)
       * @param  {string} owner : Repository owner
       * @param  {string} repo : Repository where to save the project definition
       * @param  {string} token : Authentication token
       * @return {object|false} : returns a JSON of the created file of false is something goes wrong
       */
      async function saveVueggProject ({project, owner, repo, token}) {
        let existingRepo = await getRepo(owner, repo, token)

        if (!existingRepo) { await createRepo(repo, token) }

        return await saveFile(project, owner, repo, 'vue.gg', token)
      }
      /**
       * [getRepo description]
       * @param  {[type]} owner [description]
       * @param  {[type]} repo  [description]
       * @param  {[type]} [token] [description]
       * @return {[type]}       [description]
       */
      async function getRepo (owner, repo, token) {
        // octokit.authenticate({type: 'oauth', token})
        try {
          return await octokit.repos.get({owner, repo})
        } catch (e) {
          console.log('(REPO) - ' + owner + '/' + repo + '  does not exist')
          return false
        }
      }
      `,
    },
  ],
  invalid: [],
});
