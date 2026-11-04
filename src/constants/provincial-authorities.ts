/**
 * Canadian provincial and territorial security licensing authorities, used to suggest the issuing
 * authority of a security license. Same table as the web client (provincial-authorities.constants.ts).
 */
export const PROVINCIAL_AUTHORITIES: Readonly<Record<string, string>> = {
  ON: 'Ministry of the Solicitor General',
  AB: 'Alberta Public Safety and Emergency Services',
  BC: 'Ministry of Public Safety and Solicitor General (Security Programs Division)',
  QC: 'Bureau de la sécurité privée (BSP)',
  MB: 'Manitoba Justice',
  SK: 'Financial and Consumer Affairs Authority (FCAA)',
  NS: 'Department of Justice (Public Safety and Security Division)',
  NB: 'Department of Justice and Public Safety',
  NL: 'Department of Digital Government and Service NL',
  PE: 'Department of Justice and Public Safety (PEI Firearms Office)',
  YT: 'Government of Yukon (Professional Licensing)',
  NT: 'Department of Justice (Legal Registries)',
  NU: 'Department of Justice (Legal Registries)',
};

/** The issuing authority for a province code, or '' when there is none. */
export function issuingAuthorityFor(provinceCode: string | null | undefined) {
  return provinceCode ? (PROVINCIAL_AUTHORITIES[provinceCode] ?? '') : '';
}
