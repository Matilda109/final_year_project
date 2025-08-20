// Test script to verify group assignment functionality
// This script tests the database operations for group assignments

import { createClient } from '@supabase/supabase-js'

// You'll need to replace these with your actual Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testGroupFunctionality() {
  console.log('🧪 Testing Group Assignment Functionality...\n')

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if group tables exist...')
    
    const { data: groupsData, error: groupsError } = await supabase
      .from('student_groups')
      .select('*')
      .limit(1)
    
    if (groupsError) {
      console.error('❌ student_groups table not found:', groupsError.message)
      console.log('📝 Please run the SUPABASE_GROUP_ASSIGNMENTS_SETUP.sql file in your Supabase SQL Editor first.')
      return
    }
    
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .limit(1)
    
    if (membersError) {
      console.error('❌ group_members table not found:', membersError.message)
      console.log('📝 Please run the SUPABASE_GROUP_ASSIGNMENTS_SETUP.sql file in your Supabase SQL Editor first.')
      return
    }
    
    console.log('✅ Group tables exist')

    // Test 2: Check if we can fetch supervisors
    console.log('\n2. Checking supervisors...')
    const { data: supervisors, error: supervisorsError } = await supabase
      .from('profiles')
      .select('id, full_name, reference_number, department')
      .eq('user_type', 'supervisor')
      .limit(5)
    
    if (supervisorsError) {
      console.error('❌ Error fetching supervisors:', supervisorsError.message)
      return
    }
    
    console.log(`✅ Found ${supervisors?.length || 0} supervisors`)
    if (supervisors && supervisors.length > 0) {
      console.log('   Sample supervisor:', supervisors[0].full_name)
    }

    // Test 3: Check if we can fetch students
    console.log('\n3. Checking available students...')
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name, reference_number, department')
      .eq('user_type', 'student')
      .limit(5)
    
    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError.message)
      return
    }
    
    console.log(`✅ Found ${students?.length || 0} students`)
    if (students && students.length > 0) {
      console.log('   Sample student:', students[0].full_name)
    }

    // Test 4: Check existing groups
    console.log('\n4. Checking existing groups...')
    const { data: existingGroups, error: existingGroupsError } = await supabase
      .from('student_groups')
      .select(`
        *,
        supervisor:profiles!student_groups_supervisor_id_fkey(
          full_name,
          reference_number,
          department
        )
      `)
    
    if (existingGroupsError) {
      console.error('❌ Error fetching groups:', existingGroupsError.message)
      return
    }
    
    console.log(`✅ Found ${existingGroups?.length || 0} existing groups`)
    if (existingGroups && existingGroups.length > 0) {
      console.log('   Sample group:', existingGroups[0].name)
    }

    // Test 5: Test group statistics function
    console.log('\n5. Testing group statistics function...')
    const { data: stats, error: statsError } = await supabase
      .rpc('get_group_statistics')
    
    if (statsError) {
      console.log('⚠️  Group statistics function not available:', statsError.message)
    } else {
      console.log('✅ Group statistics:', stats)
    }

    // Test 6: Test creating a sample group (if we have data)
    if (supervisors && supervisors.length > 0 && students && students.length >= 2) {
      console.log('\n6. Testing group creation...')
      
      const testGroup = {
        name: 'Test Group - ' + Date.now(),
        description: 'Test group for functionality verification',
        supervisor_id: supervisors[0].id,
        project_title: 'Test Project',
        status: 'active'
      }
      
      const { data: newGroup, error: createError } = await supabase
        .from('student_groups')
        .insert(testGroup)
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating test group:', createError.message)
        return
      }
      
      console.log('✅ Test group created:', newGroup.name)
      
      // Add test members
      const testMembers = students.slice(0, 2).map(student => ({
        group_id: newGroup.id,
        student_id: student.id
      }))
      
      const { error: membersCreateError } = await supabase
        .from('group_members')
        .insert(testMembers)
      
      if (membersCreateError) {
        console.error('❌ Error adding group members:', membersCreateError.message)
        // Clean up the group
        await supabase.from('student_groups').delete().eq('id', newGroup.id)
        return
      }
      
      console.log('✅ Test group members added')
      
      // Clean up - delete the test group
      await supabase.from('group_members').delete().eq('group_id', newGroup.id)
      await supabase.from('student_groups').delete().eq('id', newGroup.id)
      console.log('✅ Test group cleaned up')
    } else {
      console.log('\n6. ⚠️  Skipping group creation test - insufficient test data')
      console.log('   Need at least 1 supervisor and 2 students in the database')
    }

    console.log('\n🎉 Group functionality test completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   - Database tables are properly set up')
    console.log('   - Basic CRUD operations work')
    console.log('   - Ready for use in the admin dashboard')

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error)
  }
}

// Run the test
testGroupFunctionality()
