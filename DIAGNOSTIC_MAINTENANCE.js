// DIAGNOSTIC: Check Vehicle Expenses Data
// Run this in browser console to check database status

async function diagnoseMaintenanceData() {
  console.log('🔍 Starting maintenance data diagnostic...\n');
  
  // Import supabase
  const { supabase } = await import('./supabase');
  
  try {
    // 1. Check if vehicle_expenses table exists and has data
    console.log('1️⃣ Checking vehicle_expenses table...');
    const { data: allExpenses, error: expError, count } = await supabase
      .from('vehicle_expenses')
      .select('*', { count: 'exact' })
      .limit(10);
    
    if (expError) {
      console.error('❌ Error accessing vehicle_expenses:', expError.message);
      console.error('   This might be an RLS (Row Level Security) issue');
      return;
    }
    
    console.log(`✅ Table accessible`);
    console.log(`   Total records: ${count}`);
    console.log(`   Sample records: ${allExpenses?.length || 0}`);
    
    if (allExpenses && allExpenses.length > 0) {
      console.log('   First expense:', allExpenses[0]);
    }
    
    // 2. Check cars table
    console.log('\n2️⃣ Checking cars table...');
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('id, brand, model, plate_number')
      .limit(5);
    
    if (carsError) {
      console.error('❌ Error accessing cars:', carsError.message);
      return;
    }
    
    console.log(`✅ Found ${cars?.length || 0} cars`);
    
    // 3. Check each car's expenses
    if (cars && cars.length > 0) {
      console.log('\n3️⃣ Checking expenses per car...');
      
      for (const car of cars) {
        const { data: carExpenses, error: carError } = await supabase
          .from('vehicle_expenses')
          .select('*')
          .eq('car_id', car.id);
        
        if (carError) {
          console.error(`❌ Car ${car.id}: Error - ${carError.message}`);
        } else {
          console.log(`✅ Car ${car.brand} ${car.model} (${car.id}): ${carExpenses?.length || 0} expenses`);
        }
      }
    }
    
    // 4. Summary
    console.log('\n' + '='.repeat(50));
    if (count === 0) {
      console.log('⚠️ ISSUE FOUND: No vehicle expenses in database');
      console.log('   ACTION: Add vehicle expenses via the Expenses page');
    } else {
      console.log('✅ Database looks OK - check browser console for errors');
    }
    
  } catch (err) {
    console.error('❌ Diagnostic error:', err);
  }
}

// Run it
diagnoseMaintenanceData();
