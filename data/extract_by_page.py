import PyPDF2
import os
import csv

def process_text_to_csv(input_file_path, output_csv_path):
    try:
        # Read the content of the text file
        with open(input_file_path, 'r', encoding='utf-8') as txt_file:
            lines = txt_file.readlines()
        
        # Step 1: Delete the first two lines
        if len(lines) > 2:
            lines = lines[2:]
        
        # Step 2: Process each line
        processed_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Find the first space from the start
            first_space_idx = line.find(' ')
            if first_space_idx == -1:
                print(f"Skipping line in {input_file_path}: No first space found - {line}")
                continue
                
            # Find the 11th space from the end
            chars = list(line)
            spaces = []
            for i in range(len(chars) - 1, -1, -1):
                if chars[i] == ' ':
                    spaces.append(i)
            
            if len(spaces) < 11:
                print(f"Skipping line in {input_file_path}: Fewer than 11 spaces - {line}")
                continue
                
            eleventh_space_idx = spaces[10]  # 11th space (0-based index 10)
            
            # Delete everything between first space and 11th space from the end
            course_code = line[:first_space_idx]
            remaining = line[eleventh_space_idx + 1:]
            
            # Reconstruct the line
            temp_line = course_code + ' ' + remaining
            
            # Replace spaces with commas as specified
            chars = list(temp_line)
            spaces = []
            for i in range(len(chars) - 1, -1, -1):
                if chars[i] == ' ':
                    spaces.append(i)
            
            # Indices to replace (1st, 2nd, 7th, 8th, 9th, 10th, 11th from the end)
            spaces_to_replace = [0, 1, 6, 7, 8, 9, 10]
            for idx in spaces_to_replace:
                if idx < len(spaces):
                    chars[spaces[idx]] = ','
            
            # Join characters into a string
            processed_line = ''.join(chars)
            
            # Split by commas to get fields
            fields = processed_line.split(',')
            fields = [field.strip() for field in fields if field.strip()]
            
            # Clean fields: Replace double quotes with single quotes
            cleaned_fields = [field.replace('"', "'") for field in fields]
            
            processed_lines.append(cleaned_fields)
        
        # Write the processed content to a CSV file
        with open(output_csv_path, 'w', encoding='utf-8', newline='') as csv_file:
            writer = csv.writer(csv_file, quoting=csv.QUOTE_MINIMAL)
            for fields in processed_lines:
                writer.writerow(fields)
        
        print(f"Processed {input_file_path} to {output_csv_path}")
        
    except Exception as e:
        print(f"Error processing {input_file_path}: {str(e)}")
        # Log the content for debugging
        with open(input_file_path, 'r', encoding='utf-8') as txt_file:
            content = txt_file.read()
            print(f"Content of {input_file_path}:\n{content}\n")

def merge_csv_files(csv_files, output_big_csv, header):
    try:
        with open(output_big_csv, 'w', encoding='utf-8', newline='') as big_csv:
            writer = csv.writer(big_csv, quoting=csv.QUOTE_MINIMAL)
            # Write the header without quotes
            writer.writerow(header)
            
            # Iterate through each CSV file
            for csv_file in csv_files:
                with open(csv_file, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f, quoting=csv.QUOTE_MINIMAL)
                    for row in reader:
                        if row:  # Only write non-empty rows
                            writer.writerow(row)
        
        print(f"Merged all CSV files into {output_big_csv}")
        
    except Exception as e:
        print(f"Error merging CSV files: {str(e)}")

def extract_pdf_to_text_per_page(pdf_path, output_folder):
    try:
        # Create output folder if it doesn't exist
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        # List to store paths of generated CSV files
        csv_files = []
        
        # Open the PDF file
        with open(pdf_path, 'rb') as pdf_file:
            # Create a PDF reader object
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Iterate through each page
            for page_num, page in enumerate(pdf_reader.pages, start=1):
                # Extract text from the page
                page_text = page.extract_text()
                
                if page_text:
                    # Define output file paths
                    output_txt_path = os.path.join(output_folder, f"page_{page_num}.txt")
                    output_csv_path = os.path.join(output_folder, f"page_{page_num}.csv")
                    
                    # Write page text to a temporary text file
                    with open(output_txt_path, 'w', encoding='utf-8') as txt_file:
                        txt_file.write(page_text)
                    
                    print(f"Page {page_num} saved to {output_txt_path}")
                    
                    # Process the text file to create a CSV
                    process_text_to_csv(output_txt_path, output_csv_path)
                    csv_files.append(output_csv_path)
                    
                    # Remove the temporary text file
                    os.remove(output_txt_path)
                else:
                    print(f"Page {page_num} has no extractable text")
        
        # Merge all CSV files into a single big CSV
        header = ["Course Code", "Credit", "Section", "Faculty Code", "Time", "Room", "Seat"]
        output_big_csv = os.path.join(output_folder, "combined_courses.csv")
        merge_csv_files(csv_files, output_big_csv, header)
        
        print(f"All pages processed. Files saved and merged in {output_folder}")
        
    except FileNotFoundError:
        print(f"Error: The file {pdf_path} was not found")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

# Example usage
if __name__ == "__main__":
    pdf_file_path = "./252-offered-courses-list.pdf"  # Your PDF file path
    output_folder_path = "pdf_output"  # Your output folder path
    extract_pdf_to_text_per_page(pdf_file_path, output_folder_path)