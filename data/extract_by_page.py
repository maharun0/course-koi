import pandas as pd
import re
import os
from pathlib import Path
from typing import List, Dict, Optional
import tabula

def parse_time_format(time_str: str) -> str:
    """Convert time format from 'RA 11:20 AM - 12:50 PM' to '11:20 AM - 12:50 PM'"""
    if not time_str or pd.isna(time_str) or str(time_str).strip() == '':
        return ''
    
    time_str = str(time_str).strip()
    time_clean = re.sub(r'^[A-Z]{1,4}\s+', '', time_str)
    return time_clean

def parse_days(time_str: str) -> str:
    """Extract day codes from time string like 'RA 11:20 AM - 12:50 PM'"""
    if not time_str or pd.isna(time_str) or str(time_str).strip() == '':
        return ''
    
    time_str = str(time_str).strip()
    day_match = re.match(r'^([A-Z]{1,4})\s+', time_str)
    if day_match:
        return day_match.group(1)
    return ''

def extract_course_code(text: str) -> str:
    """Extract course code from text like 'ACT201' or '253 ACT ACT201 Introduction...'"""
    if not text or pd.isna(text):
        return ''
    
    text = str(text).strip()
    
    # Direct course code match
    direct_match = re.search(r'\b([A-Z]{3}\d{3})\b', text)
    if direct_match:
        return direct_match.group(1)
    
    return ''

def extract_credit(text: str) -> str:
    """Extract credit from text like '3.0' or '3.0 1'"""
    if not text or pd.isna(text):
        return ''
    
    text = str(text).strip()
    credit_match = re.search(r'\b(\d+\.\d+)\b', text)
    if credit_match:
        return credit_match.group(1)
    
    return ''

def extract_section(text: str) -> str:
    """Extract section number from text"""
    if not text or pd.isna(text):
        return ''
    
    text = str(text).strip()
    
    # Look for section after credit (like "3.0 1" or "3.0 10")
    section_match = re.search(r'\d+\.\d+\s+(\d+)', text)
    if section_match:
        return section_match.group(1)
    
    # Or just a standalone number 1-99
    standalone_match = re.match(r'^(\d{1,2})$', text)
    if standalone_match:
        num = int(standalone_match.group(1))
        if 1 <= num <= 99:
            return str(num)
    
    return ''

def extract_room(text: str) -> str:
    """Extract room code like NAC510, OAT803"""
    if not text or pd.isna(text):
        return ''
    
    text = str(text).strip()
    room_match = re.search(r'\b([A-Z]{2,4}\d+[A-Z0-9_]*)\b', text)
    if room_match:
        return room_match.group(1)
    
    return ''

def extract_faculty(text: str) -> str:
    """Extract faculty code"""
    if not text or pd.isna(text):
        return ''
    
    text = str(text).strip()
    
    # Skip if it looks like a room, course code, or other data
    if re.match(r'^[A-Z]{3}\d{3}$', text):  # Course code
        return ''
    if re.match(r'^[A-Z]{2,4}\d+', text):   # Room code
        return ''
    if re.match(r'^\d+$', text):            # Just a number
        return ''
    if len(text) > 10:                      # Too long
        return ''
    
    # Should be short alphanumeric code
    if re.match(r'^[A-Za-z][A-Za-z0-9]{0,5}$', text):
        return text
    
    return ''

def extract_seat_capacity(text: str) -> str:
    """Extract seat capacity"""
    if not text or pd.isna(text):
        return ''
    
    text = str(text).strip()
    
    # Should be a reasonable number for seat capacity
    if text.isdigit():
        num = int(text)
        if 0 <= num <= 500:  # Reasonable range for classroom capacity
            return text
    
    return ''

def smart_extract_from_row(row_data: List[str]) -> Dict[str, str]:
    """
    Smart extraction that tries to find course data anywhere in the row
    """
    result = {
        'Course Code': '',
        'Credit': '',
        'Section': '',
        'Faculty': '',
        'Days': '',
        'Time': '',
        'Room': '',
        'Seat': ''
    }
    
    # Join all row data to search through
    all_text = ' '.join([str(cell) for cell in row_data if not pd.isna(cell)])
    
    # Extract course code (highest priority)
    course_code = extract_course_code(all_text)
    if not course_code:
        return result  # Skip if no course code found
    
    result['Course Code'] = course_code
    
    # Try to extract other fields from each cell
    for cell in row_data:
        cell_str = str(cell).strip()
        if pd.isna(cell) or cell_str == '' or cell_str == 'nan':
            continue
        
        # Extract credit
        if not result['Credit']:
            credit = extract_credit(cell_str)
            if credit:
                result['Credit'] = credit
        
        # Extract section
        if not result['Section']:
            section = extract_section(cell_str)
            if section:
                result['Section'] = section
        
        # Extract faculty
        if not result['Faculty']:
            faculty = extract_faculty(cell_str)
            if faculty:
                result['Faculty'] = faculty
        
        # Extract time and days
        if not result['Time']:
            if re.search(r'\d{1,2}:\d{2}\s*(AM|PM)', cell_str):
                result['Time'] = parse_time_format(cell_str)
                result['Days'] = parse_days(cell_str)
        
        # Extract room
        if not result['Room']:
            room = extract_room(cell_str)
            if room:
                result['Room'] = room
        
        # Extract seat capacity
        if not result['Seat']:
            seat = extract_seat_capacity(cell_str)
            if seat:
                result['Seat'] = seat
    
    return result

def process_any_table(df: pd.DataFrame, table_num: int) -> List[Dict]:
    """
    Process any table structure and try to extract course data
    """
    extracted_data = []
    
    # Convert all data to strings and remove completely empty rows
    df = df.astype(str)
    df = df.replace('nan', '')
    
    # Remove rows that are entirely empty
    df = df.loc[~(df == '').all(axis=1)]
    
    if df.empty:
        return extracted_data
    
    print(f"Table {table_num} - Processing {len(df)} rows with {df.shape[1]} columns")
    
    successful_extractions = 0
    
    for idx, row in df.iterrows():
        row_data = row.tolist()
        
        # Skip header-like rows
        row_text = ' '.join(row_data).lower()
        if any(header in row_text for header in ['semester', 'course', 'faculty', 'time', 'room', 'seat', 'credit']):
            continue
        
        # Try to extract course data from this row
        extracted = smart_extract_from_row(row_data)
        
        if extracted['Course Code']:  # Only add if we found a course code
            extracted_data.append(extracted)
            successful_extractions += 1
            
            # Show first few extractions for debugging
            if successful_extractions <= 2 and table_num <= 5:
                print(f"  Row {idx}: {extracted}")
    
    if successful_extractions > 0:
        print(f"Table {table_num}: Extracted {successful_extractions} courses")
    
    return extracted_data

def extract_all_tables_from_pdf(pdf_path: str) -> List[pd.DataFrame]:
    """
    Extract ALL possible tables from PDF without filtering
    """
    all_tables = []
    
    try:
        print("Extracting with multiple methods...")
        
        # Method 1: Stream (good for tables without borders)
        try:
            tables1 = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True, stream=True)
            all_tables.extend(tables1)
            print(f"Stream method: {len(tables1)} tables")
        except Exception as e:
            print(f"Stream method failed: {e}")
        
        # Method 2: Lattice (good for tables with borders)  
        try:
            tables2 = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True, lattice=True)
            all_tables.extend(tables2)
            print(f"Lattice method: {len(tables2)} tables")
        except Exception as e:
            print(f"Lattice method failed: {e}")
        
        # Method 3: Default
        try:
            tables3 = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True)
            all_tables.extend(tables3)
            print(f"Default method: {len(tables3)} tables")
        except Exception as e:
            print(f"Default method failed: {e}")
        
        print(f"Total tables extracted: {len(all_tables)}")
        
        # Don't filter - process ALL tables regardless of size
        return all_tables
        
    except Exception as e:
        print(f"All extraction methods failed: {e}")
        return []

def process_pdf_to_csv(pdf_path: str, output_folder: str):
    """
    Main function - extract ALL course data aggressively
    """
    Path(output_folder).mkdir(parents=True, exist_ok=True)
    
    pdf_name = Path(pdf_path).stem
    output_csv = os.path.join(output_folder, f"{pdf_name}_courses.csv")
    
    print(f"Processing PDF: {pdf_path}")
    print(f"Output will be saved to: {output_csv}")
    
    try:
        # Extract ALL tables
        tables = extract_all_tables_from_pdf(pdf_path)
        
        if not tables:
            print("No tables found!")
            return None
        
        all_extracted_data = []
        
        # Process EVERY table
        for i, table in enumerate(tables):
            if table.empty:
                continue
            
            # Show progress
            if (i + 1) % 20 == 0:
                print(f"Progress: {i+1}/{len(tables)} tables processed, {len(all_extracted_data)} courses found")
            
            extracted_data = process_any_table(table, i+1)
            all_extracted_data.extend(extracted_data)
        
        if all_extracted_data:
            # Convert to DataFrame
            output_df = pd.DataFrame(all_extracted_data)
            
            # Remove duplicates
            initial_count = len(output_df)
            output_df = output_df.drop_duplicates(subset=['Course Code', 'Section'], keep='first')
            final_count = len(output_df)
            
            print(f"Removed {initial_count - final_count} duplicate records")
            
            # Save to CSV
            output_df.to_csv(output_csv, index=False)
            
            print(f"\n{'='*60}")
            print(f"✅ SUCCESS! Extracted {final_count} unique course records!")
            print(f"📁 Saved to: {output_csv}")
            print(f"\n📋 Sample of final data:")
            print(output_df.head(10).to_string(index=False))
            
            return output_df
        else:
            print("❌ No course data could be extracted!")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    pdf_file_path = "./253-offered-courses-list-080925-v1-1.pdf"
    output_folder_path = "pdf_output"
    
    result = process_pdf_to_csv(pdf_file_path, output_folder_path)
    
    if result is not None:
        print(f"\n🎉 Processing completed successfully!")
        print(f"📊 Total courses extracted: {len(result)}")
    else:
        print("\n❌ Processing failed. Please check the PDF file and try again.")