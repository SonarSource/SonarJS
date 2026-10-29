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

// JS-2698: keep this inventory and its matching semantics in sync with Analyzer Commons.
// A match identifies a possible identifier; the caller must also check its use in the AST.
const IDENTIFIER_URLS = new Map<string, RegExp>([
  ['adnovum.ch', /^\/nevisidm\/ws/],
  ['api.onedoc.ch', /^\/(?:LocationServiceType|profession)/],
  ['archway.archre.com', /^\/user_profile_id/],
  ['auth0.com', /^\/oauth\/grant-type/],
  ['big.arvato-infoscore.de', /^\/BIG_V2/],
  ['bigcontent.io', /^\/cms\/schema/],
  ['cloud.gbtec.de', /^\/rels/],
  ['cv.iptc.org', /^\/newscodes\/digitalsourcetype/],
  ['dashif.org', /^\/(?:guidelines|thumbnail_tile)/],
  ['data.europa.eu', /^\/(?:esco|p27)/],
  ['dbpedia.org', /^\/(?:ontology|property|resource)/],
  ['diaceutics.com', /^\/roles/],
  ['elimu.io', /^\/careplan\/disableSMS/],
  ['experian.com', /^\/communicationV2\/schemas/],
  ['g-p.com', /^\/schema/],
  ['hapifhir.io', /^\/fhir/],
  ['icanotes.com', /^\/txplan-shrubs/],
  ['jabber.org', /^\/protocol/],
  ['janitza.de', /^\/vocab/],
  ['macedir.org', /^\/entity-category/],
  ['metadatahub.bijnpo.nl', /^\/(?:graph|shapes)/],
  ['neverssl.com', /^\//],
  ['nhso.uk', /^\/fhir/],
  ['onlinetrust.nhs.uk', /^\/fhir/],
  ['ontology.metadatahub.bijnpo.nl', /^\/governance/],
  ['osmand.net', /^\//],
  ['pds.nasa.gov', /^\/pds4/],
  ['powerbi.com', /^\/product\/schema/],
  ['purl.oclc.org', /^\/ooxml/],
  ['schemas.delagelanden.com', /^\/susi3/],
  ['schemas.openxmlformats.org', /^\//],
  ['service.admin.ws.five9.com', /^\//],
  ['snomed.info', /^\/sct/],
  ['soapserver.commsoft.net', /^\//],
  ['tempuri.org', /^\/(?:GetPeso|CreditApplicationServicePortType)/],
  ['terminology.hl7.org', /^\/CodeSystem/],
  ['tizen.org', /^\/(?:feature|system)/],
  ['www.ebu.ch', /^\/metadata\/ontologies/],
  ['www.fnf.com', /^\/xes/],
  ['www.garmin.com', /^\/xmlschemas/],
  ['www.iab.com', /^\/VAST/],
  ['www.ifxforum.org', /^\/IFX_150/],
  ['www.naxml.org', /^\/POSBO/],
  ['www.nlm.nih.gov', /^\/research\/umls\/rxnorm/],
  ['www.openarchives.org', /^\/OAI/],
  ['www.pcats.org', /^\/schema/],
  ['www.sat.gob.gt', /^\/face2/],
  ['www.sitemaps.org', /^\/schemas/],
  ['www.topografix.com', /^\/GPX/],
  ['www.w3.org', /^\//],
]);

export function isKnownIdentifierUrl(value: string): boolean {
  // Do not use URL.hostname (drops ports), URL.host (normalizes :80), or a lowercased
  // URL (changes identifier spelling). Only the authority is case-insensitive.
  const match = /^http:\/\/([^\s/?#\\]+)([/?#][^\s\\]*)?$/i.exec(value);
  if (!match) {
    return false;
  }
  const remainder = match[2] ?? '';
  const suffix = remainder.startsWith('/') ? remainder : `/${remainder}`;
  return IDENTIFIER_URLS.get(match[1].toLowerCase())?.test(suffix) === true;
}
