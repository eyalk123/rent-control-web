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
        texts: {
          /** The shipped file's name, e.g. "LICENSE", or the SPDX identifier of a standard text. */
          label: string;
          /** True when the package ships no license file and this is the canonical SPDX text. */
          standard: boolean;
          /** Index into `virtual:third-party-notices/texts`. */
          text: number;
        }[];
      }[];
    }[];
  };
  export default notices;
}

declare module 'virtual:third-party-notices/texts' {
  /** Every distinct license text, referenced by index from `virtual:third-party-notices`. */
  const texts: string[];
  export default texts;
}
