//import { decode } from "next-auth/jwt";
const token = 'foo';

(async () => {
  await decode({
    token: token,
    secret: process.env.NEXTAUTH_SECRET,
    salt: 'foo',
  });
})();


//export async function decode<Payload = JWT>(
//    params: JWTDecodeParams
//  ): Promise<Payload | null> {
//export async function decode(
async function decode(
    params
  ) {
    const { token, secret, salt } = params
    const secrets = Array.isArray(secret) ? secret : [secret]
    if (!token) return null
    // const { payload } = await jwtDecrypt(
    //   token,
    //   async ({ kid, enc }) => {
        for (const secret of secrets) {
          const encryptionSecret = await getDerivedEncryptionKey(
            //enc,
            'A256GCM',
            secret,
            salt
          )
        }

    //     throw new Error("no matching decryption secret")
    //   },
    //   {
    //     clockTolerance: 15,
    //     keyManagementAlgorithms: [alg],
    //     contentEncryptionAlgorithms: [enc, "A256GCM"],
    //   }
    // )
    //return payload as Payload
    return payload
  }


async function getDerivedEncryptionKey(
//enc: string,
//keyMaterial: Parameters<typeof hkdf>[1],
//salt: Parameters<typeof hkdf>[2]
  enc,
  keyMaterial, // here
  salt,
) {
  //let length: number
  let length
  switch (enc) {
    case "A256CBC-HS512":
      length = 64
      break
    case "A256GCM":
      length = 32
      break
    default:
      throw new Error("Unsupported JWT Content Encryption Algorithm")
  }
  return await hkdf(
    "sha256",
    keyMaterial, // here
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    length
  )
}

//async function hkdf(
//    digest: 'sha256' | 'sha384' | 'sha512' | 'sha1' | string,
//    ikm: Uint8Array | string,
//    salt: Uint8Array | string,
//    info: Uint8Array | string,
//    keylen: number,
//  ): Promise<Uint8Array> {
async function hkdf(
    digest,
    ikm,
    salt,
    info,
    keylen,
  ) {
    return derive(
      normalizeDigest(digest),
      normalizeIkm(ikm), // here
      normalizeUint8Array(salt, 'salt'),
    )
  }

  function derive() {
  }

  //function normalizeIkm(input: unknown) {
  function normalizeIkm(input) {
    const ikm = normalizeUint8Array(input, 'ikm')
    if (!ikm.byteLength) throw new TypeError(`"ikm" must be at least one byte in length`)
    return ikm
  }

  //function normalizeUint8Array(input: unknown, label: string) {
  function normalizeUint8Array(input, label) {
    if (typeof input === 'string') return new TextEncoder().encode(input)
    if (!(input instanceof Uint8Array))
      throw new TypeError(`"${label}"" must be an instance of Uint8Array or a string`) // lol, we are throwing the error ourselves! // Noncompliant: process.env.NEXTAUTH_SECRET can be undefined
    return input
  }

  function normalizeDigest() {}
