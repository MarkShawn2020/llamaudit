import 'dotenv/config';
// 或者
import * as dotenv from 'dotenv';
dotenv.config();
import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { documentTypes, organizations, teams } from './schema';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seedDocumentTypes() {
  console.log('Seeding document types...');
  
  try {
    // 检查是否已存在文档类型
    const existingTypes = await db.select().from(documentTypes);
    
    if (existingTypes.length === 0) {
      // 创建基础文档类型
      await db.insert(documentTypes).values([
        {
          name: '会议纪要',
          description: '记录会议过程、讨论和决策的文档',
        },
        {
          name: '合同',
          description: '法律合同和协议文档',
        },
        {
          name: '附件',
          description: '其他类型的辅助文档',
        },
      ]);
      console.log('Document types created successfully.');
    } else {
      console.log('Document types already exist, skipping.');
    }
  } catch (error) {
    console.error('Error seeding document types:', error);
  }
}

async function seedOrganizations() {
  console.log('Seeding organizations...');
  
  try {
    // 检查是否已存在组织
    const existingOrgs = await db.select().from(organizations);
    
    if (existingOrgs.length === 0) {
      // 获取默认团队
      const defaultTeam = (await db.select().from(teams).limit(1))[0];
      
      if (defaultTeam) {
        // 创建示例组织
        await db.insert(organizations).values([
          {
            code: 'ORG1',
            name: 'XX公司',
            teamId: defaultTeam.id,
          },
          {
            code: 'ORG2',
            name: 'YY事业单位',
            teamId: defaultTeam.id,
          },
        ]);
        console.log('Organizations created successfully.');
      } else {
        console.log('No teams found, skipping organization creation.');
      }
    } else {
      console.log('Organizations already exist, skipping.');
    }
  } catch (error) {
    console.error('Error seeding organizations:', error);
  }
}

async function main() {
  try {
    // 创建 Stripe 产品和价格（如果需要）
    // await createStripeProducts();
    
    // 初始化文档类型
    await seedDocumentTypes();
    
    // 初始化组织
    await seedOrganizations();
    
    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Error running seed:', error);
  } finally {
    process.exit(0);
  }
}

main();
