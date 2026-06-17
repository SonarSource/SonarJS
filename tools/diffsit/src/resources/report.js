/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
function toggleGroup(header) {
  var body = header.nextElementSibling;
  var icon = header.querySelector('.toggle-icon');
  var isOpen = body.classList.toggle('open');
  icon.textContent = isOpen ? '\u25bc' : '\u25b6';
}
function expandAll(sectionId) {
  var section = document.getElementById(sectionId);
  if (!section) return;
  section.querySelectorAll('.group-body').forEach(function (b) {
    b.classList.add('open');
    b.previousElementSibling.querySelector('.toggle-icon').textContent = '\u25bc';
  });
}
function collapseAll(sectionId) {
  var section = document.getElementById(sectionId);
  if (!section) return;
  section.querySelectorAll('.group-body').forEach(function (b) {
    b.classList.remove('open');
    b.previousElementSibling.querySelector('.toggle-icon').textContent = '\u25b6';
  });
}
function applyFilters() {
  var projectEl = document.getElementById('project-filter');
  var ruleEl = document.getElementById('rule-filter');
  var projectVal = projectEl ? projectEl.value : '';
  var ruleVal = ruleEl ? ruleEl.value : '';
  // Filter individual rows (carry project and/or rule data attributes)
  document.querySelectorAll('.issue-row').forEach(function (row) {
    var projOk = !projectVal || !row.dataset.project || row.dataset.project === projectVal;
    var ruleOk = !ruleVal || !row.dataset.rule || row.dataset.rule === ruleVal;
    row.style.display = projOk && ruleOk ? '' : 'none';
  });
  // Show/hide whole groups
  document.querySelectorAll('.issue-group').forEach(function (grp) {
    // Rule-level filter on the group itself (rule-grouped mode)
    if (ruleVal && grp.dataset.rule && grp.dataset.rule !== ruleVal) {
      grp.style.display = 'none';
      return;
    }
    // Hide group if all its rows are hidden
    var rows = grp.querySelectorAll('.issue-row');
    if (rows.length === 0) {
      grp.style.display = '';
      return;
    }
    var allHidden = Array.from(rows).every(function (r) {
      return r.style.display === 'none';
    });
    grp.style.display = allHidden ? 'none' : '';
  });
}
function filterProjects(select) {
  applyFilters();
}
function filterRules(select) {
  applyFilters();
}
