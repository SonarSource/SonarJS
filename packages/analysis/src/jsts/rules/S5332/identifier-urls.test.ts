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
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { isKnownIdentifierUrl } from './identifier-urls.js';

// Shared URL cases: keep these aligned with CleartextProtocolFilterTest in Analyzer Commons.
const identifiers = [
  'http://adnovum.ch/nevisidm/ws',
  'http://api.onedoc.ch/LocationServiceType',
  'http://api.onedoc.ch/profession',
  'http://archway.archre.com/user_profile_id',
  'http://auth0.com/oauth/grant-type/password-realm',
  'http://big.arvato-infoscore.de/BIG_V2',
  'http://bigcontent.io/cms/schema/v1',
  'http://cloud.gbtec.de/rels',
  'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture',
  'http://dashif.org/guidelines',
  'http://dashif.org/thumbnail_tile',
  'http://data.europa.eu/esco/skill',
  'http://data.europa.eu/p27',
  'http://dbpedia.org/ontology/Person',
  'http://dbpedia.org/property/name',
  'http://dbpedia.org/resource/Berlin',
  'http://diaceutics.com/roles',
  'http://elimu.io/careplan/disableSMS',
  'http://experian.com/communicationV2/schemas',
  'http://g-p.com/schema',
  'http://hapifhir.io/fhir',
  'http://icanotes.com/txplan-shrubs',
  'http://jabber.org/protocol',
  'http://jabber.org/protocol/muc',
  'http://janitza.de/vocab',
  'http://macedir.org/entity-category',
  'http://metadatahub.bijnpo.nl/graph',
  'http://metadatahub.bijnpo.nl/shapes',
  'http://neverssl.com',
  'http://neverssl.com/',
  'http://nhso.uk/fhir',
  'http://onlinetrust.nhs.uk/fhir',
  'http://ontology.metadatahub.bijnpo.nl/governance',
  'http://osmand.net',
  'http://osmand.net/extensions',
  'http://osmand.net?mode=extensions#schema',
  'http://pds.nasa.gov/pds4',
  'http://powerbi.com/product/schema#basic',
  'http://purl.oclc.org/ooxml',
  'http://schemas.delagelanden.com/susi3',
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  'http://service.admin.ws.five9.com/',
  'http://snomed.info/sct',
  'http://soapserver.commsoft.net/',
  'http://tempuri.org/GetPeso',
  'http://tempuri.org/CreditApplicationServicePortType',
  'http://terminology.hl7.org/CodeSystem',
  'http://tizen.org/feature/network.wifi',
  'http://tizen.org/system/platform.version',
  'http://www.ebu.ch/metadata/ontologies',
  'http://www.fnf.com/xes',
  'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2',
  'http://www.iab.com/VAST',
  'http://www.ifxforum.org/IFX_150',
  'http://www.naxml.org/POSBO',
  'http://www.nlm.nih.gov/research/umls/rxnorm',
  'http://www.openarchives.org/OAI/2.0/',
  'http://www.pcats.org/schema',
  'http://www.sat.gob.gt/face2',
  'http://www.sitemaps.org/schemas/sitemap/0.9',
  'http://www.topografix.com/GPX/1/1',
  'http://www.topografix.com/GPX?version=1#section',
  'HTTP://WWW.TOPOGRAFIX.COM/GPX/1/1',
  'http://www.w3.org/2000/svg',
];

const nonIdentifiers = [
  'http://insecure.com',
  'http://www.fnf.com/api',
  'http://metadatahub.bijnpo.nl/api',
  'http://api.onedoc.ch/appointments',
  'http://snomed.info/api',
  'http://www.topografix.com.anotherdomain.org/GPX/1/1',
  'http://auth0.com.anotherdomain.org/oauth/grant-type/password-realm',
  'http://www.topografix.com:80/GPX/1/1',
  'http://www.topografix.com:8080/GPX/1/1',
  'http://www.w3.org:80/2000/svg',
  'http://www.w3.org:${port}/2000/svg',
  'http://user@www.topografix.com/GPX/1/1',
  'http://www.topografix.com/gpx/1/1',
  'http://terminology.hl7.org/codesystem',
  'http://www.topografix.com/?schema=/GPX/1/1',
  'http://www.topografix.com/#/GPX/1/1',
  'ftp://www.topografix.com/GPX/1/1',
];

describe('S5332 identifier URL matcher', () => {
  describe('matching URLs', () => {
    for (const url of identifiers) {
      it(url, () => {
        assert.equal(isKnownIdentifierUrl(url), true);
      });
    }
  });

  describe('non-matching URLs', () => {
    for (const url of nonIdentifiers) {
      it(url, () => {
        assert.equal(isKnownIdentifierUrl(url), false);
      });
    }
  });
});
