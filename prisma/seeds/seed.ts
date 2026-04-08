import { PrismaClient, AccountType, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.assetHistory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.account.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Andi Pratama',
      email: 'andi@email.com',
      password: hashedPassword,
      phone: '+62 812 3456 7890',
      joinDate: new Date('2024-01-15'),
      preferences: {
        create: {
          currency: 'IDR',
          language: 'id',
          theme: 'system',
        },
      },
    },
  });

  console.log('👤 Created demo user:', user.email);

  // Create accounts
  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Bank BCA',
        type: AccountType.savings,
        icon: 'landmark',
        balance: new Decimal(62000000),
        color: '#3525cd',
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'GoPay',
        type: AccountType.ewallet,
        icon: 'wallet',
        balance: new Decimal(4250000),
        color: '#006c49',
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Cash',
        type: AccountType.cash,
        icon: 'banknote',
        balance: new Decimal(1500000),
        color: '#960014',
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Bank Mandiri',
        type: AccountType.savings,
        icon: 'landmark',
        balance: new Decimal(15500000),
        color: '#4f46e5',
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'OVO',
        type: AccountType.ewallet,
        icon: 'wallet',
        balance: new Decimal(1000000),
        color: '#6cf8bb',
      },
    }),
  ]);

  console.log('💳 Created', accounts.length, 'accounts');

  // Create transactions
  const transactions = [
    { description: 'Gacoan Noodle', category: 'Makanan & Minuman', categoryIcon: 'utensils', amount: 45000, type: TransactionType.expense, date: '2024-06-15', accountIndex: 1 },
    { description: 'Shell Kebon Jeruk', category: 'Transportasi', categoryIcon: 'car', amount: 250000, type: TransactionType.expense, date: '2024-06-14', accountIndex: 0 },
    { description: 'Gaji Bulanan', category: 'Pemasukan', categoryIcon: 'banknote', amount: 12000000, type: TransactionType.income, date: '2024-06-13', accountIndex: 0 },
    { description: 'Uniqlo Indonesia', category: 'Belanja', categoryIcon: 'shopping-bag', amount: 599000, type: TransactionType.expense, date: '2024-06-12', accountIndex: 0 },
    { description: 'PLN Pasca Bayar', category: 'Tagihan', categoryIcon: 'home', amount: 450000, type: TransactionType.expense, date: '2024-06-11', accountIndex: 0 },
    { description: 'Freelance Project', category: 'Pemasukan', categoryIcon: 'banknote', amount: 5000000, type: TransactionType.income, date: '2024-06-10', accountIndex: 3 },
    { description: 'Netflix Subscription', category: 'Hiburan', categoryIcon: 'tv', amount: 186000, type: TransactionType.expense, date: '2024-06-09', accountIndex: 1 },
    { description: 'Grab Transport', category: 'Transportasi', categoryIcon: 'car', amount: 35000, type: TransactionType.expense, date: '2024-06-08', accountIndex: 4 },
    { description: 'Starbucks', category: 'Makanan & Minuman', categoryIcon: 'coffee', amount: 78000, type: TransactionType.expense, date: '2024-06-07', accountIndex: 1 },
    { description: 'Tokopedia', category: 'Belanja', categoryIcon: 'shopping-bag', amount: 350000, type: TransactionType.expense, date: '2024-06-06', accountIndex: 0 },
    { description: 'Indihome', category: 'Tagihan', categoryIcon: 'wifi', amount: 399000, type: TransactionType.expense, date: '2024-06-05', accountIndex: 0 },
    { description: 'Dividen Saham', category: 'Pemasukan', categoryIcon: 'trending-up', amount: 750000, type: TransactionType.income, date: '2024-06-04', accountIndex: 3 },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: accounts[tx.accountIndex].id,
        description: tx.description,
        category: tx.category,
        categoryIcon: tx.categoryIcon,
        amount: new Decimal(tx.amount),
        type: tx.type,
        date: new Date(tx.date),
      },
    });
  }

  console.log('💰 Created', transactions.length, 'transactions');

  // Create assets
  const assetsData = [
    { name: 'Saham (IHSG)', type: 'Saham', value: 45000000, change: 5.2, icon: 'trending-up', color: '#3525cd' },
    { name: 'Reksa Dana', type: 'Reksa Dana', value: 25000000, change: 3.8, icon: 'pie-chart', color: '#006c49' },
    { name: 'Emas', type: 'Emas', value: 30000000, change: 8.1, icon: 'gem', color: '#f59e0b' },
    { name: 'Deposito', type: 'Deposito', value: 20000000, change: 1.2, icon: 'lock', color: '#4f46e5' },
    { name: 'Crypto', type: 'Crypto', value: 8500000, change: -2.4, icon: 'bitcoin', color: '#960014' },
  ];

  const totalAssetValue = assetsData.reduce((sum, a) => sum + a.value, 0);

  const assets = await Promise.all(
    assetsData.map((asset) =>
      prisma.asset.create({
        data: {
          userId: user.id,
          name: asset.name,
          type: asset.type,
          value: new Decimal(asset.value),
          allocation: new Decimal((asset.value / totalAssetValue) * 100),
          change: new Decimal(asset.change),
          icon: asset.icon,
          color: asset.color,
        },
      }),
    ),
  );

  console.log('📈 Created', assets.length, 'assets');

  // Create asset history
  const assetHistoryData = [
    { assetIndex: 0, history: [{ date: '2024-01', value: 38000000 }, { date: '2024-02', value: 39500000 }, { date: '2024-03', value: 41000000 }, { date: '2024-04', value: 42500000 }, { date: '2024-05', value: 43800000 }, { date: '2024-06', value: 45000000 }] },
    { assetIndex: 1, history: [{ date: '2024-01', value: 22000000 }, { date: '2024-02', value: 22800000 }, { date: '2024-03', value: 23500000 }, { date: '2024-04', value: 24100000 }, { date: '2024-05', value: 24600000 }, { date: '2024-06', value: 25000000 }] },
    { assetIndex: 2, history: [{ date: '2024-01', value: 25000000 }, { date: '2024-02', value: 26200000 }, { date: '2024-03', value: 27500000 }, { date: '2024-04', value: 28400000 }, { date: '2024-05', value: 29200000 }, { date: '2024-06', value: 30000000 }] },
    { assetIndex: 3, history: [{ date: '2024-01', value: 19000000 }, { date: '2024-02', value: 19200000 }, { date: '2024-03', value: 19500000 }, { date: '2024-04', value: 19700000 }, { date: '2024-05', value: 19900000 }, { date: '2024-06', value: 20000000 }] },
    { assetIndex: 4, history: [{ date: '2024-01', value: 10000000 }, { date: '2024-02', value: 9500000 }, { date: '2024-03', value: 9200000 }, { date: '2024-04', value: 8800000 }, { date: '2024-05', value: 8600000 }, { date: '2024-06', value: 8500000 }] },
  ];

  for (const assetHistory of assetHistoryData) {
    for (const h of assetHistory.history) {
      await prisma.assetHistory.create({
        data: {
          assetId: assets[assetHistory.assetIndex].id,
          date: h.date,
          value: new Decimal(h.value),
        },
      });
    }
  }

  console.log('📊 Created asset history');

  // Create budgets
  const currentPeriod = '2024-06';
  const budgets = [
    { category: 'Makanan & Minuman', icon: 'utensils', limit: 3000000, color: '#3525cd' },
    { category: 'Transportasi', icon: 'car', limit: 1500000, color: '#006c49' },
    { category: 'Tagihan', icon: 'home', limit: 2500000, color: '#4f46e5' },
    { category: 'Belanja', icon: 'shopping-bag', limit: 2000000, color: '#f59e0b' },
    { category: 'Hiburan', icon: 'tv', limit: 1000000, color: '#960014' },
    { category: 'Kesehatan', icon: 'heart', limit: 500000, color: '#6cf8bb' },
  ];

  for (const budget of budgets) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        category: budget.category,
        icon: budget.icon,
        limitAmount: new Decimal(budget.limit),
        color: budget.color,
        period: currentPeriod,
      },
    });
  }

  console.log('📋 Created', budgets.length, 'budgets');

  console.log('✅ Seed completed successfully!');
  console.log('\n📧 Demo account:');
  console.log('   Email: andi@email.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
