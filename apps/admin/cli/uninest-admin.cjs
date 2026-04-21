#!/usr/bin/env node

const readline = require("readline")
const fs = require("fs")
const path = require("path")
const bcrypt = require("bcryptjs")
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['\"]|['\"]$/g, "")

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const repoRoot = path.resolve(__dirname, "../../../")

loadEnv(path.join(repoRoot, ".env"))
loadEnv(path.join(repoRoot, ".env.local"))

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined in the environment variables.")
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
  const command = process.argv[2]

  if (command !== "create-admin") {
    console.log("Usage: npm run cli -- create-admin")
    process.exit(1)
  }

  const username = (await ask("Username: ")).trim()
  const email = (await ask("Email: ")).trim()
  const password = await ask("Password: ")

  if (!username || !email || !password) {
    console.error("Username, email, and password are required.")
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.admin.create({
    data: {
      username,
      email,
      passwordHash,
      isActive: true,
    },
  })

  console.log(`Admin created: ${username}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    rl.close()
    await prisma.$disconnect()
  })
