// Built by build-plugins/thirdPartyNotices.ts from public/third-party-notices.txt.
declare module 'virtual:third-party-notices' {
  const notices: {
    /** ISO date from the file's "Last generated:" line. */
    generated: string;
    sections: {
      /** The file's own heading, e.g. "BACKEND SERVICE". */
      title: string;
      packages: {
        name: string;
        version: string;
        /** The license as the file declares it, e.g. "(MIT AND Zlib)". */
        license: string;
        /** Keys into `texts`, one per license the declaration names. */
        licenseIds: string[];
      }[];
    }[];
    /** Canonical SPDX license text, by identifier. */
    texts: Record<string, string>;
  };
  export default notices;
}
