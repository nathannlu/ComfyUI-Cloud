from __future__ import absolute_import

__version__ = '0.2.0'

import argparse
import json
import os
import io
import sys

TEMPLATE_FILE = 'node_packager.template'
TEMPLATE_PATTERN = '${CONTENTS}'

def output(outfile, what, newline=True):
    # We need indentation for PEP8
    outfile.write(what.encode("utf-8"))
    if newline:
        outfile.write(os.linesep.encode("utf-8"))


def process_file(outfile, base_dir, package_path):
    path = os.path.splitext(package_path)[0].replace(os.path.sep, '.')
    package_start = outfile.tell()
    full_path = os.path.join(base_dir, package_path)
    with open(full_path, 'r') as f:
        # Read the whole file
        code = f.read()

        # Clean code of stupid unicode characters
        code = ''.join([i if ord(i) < 128 else ' ' for i in code])

        # Replace code with double quotes so it doesn't interfere with our
        # formatting
        code = code.replace("'''", '"""')
        
        # Insert escape character before ''' since we'll be using ''' to insert
        # the code as a string
        output(outfile, code.replace("'''", r"\'''"), newline=False)
    package_end = outfile.tell()

    is_package = 1 if path.endswith('__init__') else 0
    if is_package:
        path = path[:-9]

    # Get file timestamp
    timestamp = int(os.path.getmtime(full_path))
    return path, is_package, package_start, package_end, timestamp



def template(outfile, default_package):
    template_path = os.path.join(os.path.dirname(__file__), TEMPLATE_FILE)

    with open(template_path) as f:
        template = f.read()

    prefix_end = template.index(TEMPLATE_PATTERN)
    prefix_data = template[:prefix_end].replace('%{FORCE_EXC_HOOK}',
                                                str(None))
    prefix_data = prefix_data.replace('%{DEFAULT_PACKAGE}',
                                      default_package)
    outfile.write(prefix_data.encode("utf-8"))

    postfix_begin = prefix_end + len(TEMPLATE_PATTERN)
    return template[postfix_begin:]


def process_directory(outfile, base_dir, package_path):
    files = []
    contents = os.listdir(os.path.join(base_dir, package_path))

    for content in contents:
        next_path = os.path.join(package_path, content)
        path = os.path.join(base_dir, next_path)
        if is_module(path):
            files.append(process_file(outfile, base_dir, next_path))
        elif is_package(path):
            # @todo - this does not detect double nested dirs with no py files

            files.extend(process_directory(outfile, base_dir, next_path))

            # Patch with dir path so it can be picked up by specs
            files.append((os.path.splitext(next_path)[0].replace(os.path.sep, '.'), 0, 0, 0, 0))
    return files


def process_files(outfile, package_path):
    # template would look better as a context manager
    package_name = package_path.replace("../../custom_nodes/", "") 
    postfix = template(outfile, package_name)
    files = []
    output(outfile, "'''")

    #for package_path in packages:

    base_dir, module_name = os.path.split(package_path)
    files.extend(process_directory(outfile, base_dir, module_name))

    output(outfile, "'''")

    # Transform the list into a dictionary
    inliner_packages = {data[0]: data[1:] for data in files}
    
    # Generate the references to the positions of the different packages and
    # modules inside the main file.
    # We don't use indent to decrease the number of bytes in the file
    data = json.dumps(inliner_packages)
    output(outfile, 2 * os.linesep + 'inliner_packages = ', newline=False)
    data = data.replace('],', '],' + os.linesep + '   ')
    data = data.replace('[', '[' + os.linesep + 8 * ' ')
    data = '%s%s    %s%s%s' % (data[0], os.linesep, data[1:-1], os.linesep,
                               data[-1])
    output(outfile, data)
    # No newline on last line, as we want output file to be PEP8 compliant.
    output(outfile, postfix, newline=False)

    return outfile


def is_module(module):
    # This validation is poor, but good enough for now
    return os.path.isfile(module) and module.endswith('.py')


def is_package(package):
    # Check if there are any Python files (ending with '.py')
    if os.path.isdir(package) is not True:
        return False

    files = os.listdir(package)
    python_files = [file for file in files if file.endswith('.py')]

    return bool(python_files)

def package_custom_nodes(package):
    # Create a new buffer
    outfile = io.BytesIO()

    # Convert into single file
    outfile = process_files(outfile, package)

    return outfile

    #outfile.close()


