import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Item from '../models/Item.js';
import { CATALOG } from '../constants/catalog.js';
import logger from '../utils/logger.js';

/**
 * Upserts The Shelf's catalog by slug.
 *
 * Idempotent on purpose — running it twice changes nothing, so it is safe to
 * wire into a deploy hook. Items removed from the constant are deactivated
 * rather than deleted, so anyone who already owns one keeps it.
 */
const seed = async () => {
  await connectDatabase();

  const operations = CATALOG.map((item) => ({
    updateOne: {
      filter: { slug: item.slug },
      update: { $set: { ...item, isActive: true } },
      upsert: true,
    },
  }));

  const result = await Item.bulkWrite(operations);

  const slugs = CATALOG.map((item) => item.slug);
  const retired = await Item.updateMany(
    { slug: { $nin: slugs } },
    { $set: { isActive: false } }
  );

  logger.info(
    `Seeded The Shelf — ${result.upsertedCount} new, ${result.modifiedCount} updated, ${retired.modifiedCount} retired.`
  );

  await disconnectDatabase();
};

seed()
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error('Seeding failed:', error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
