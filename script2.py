import os
import zipfile

OUTPUT_FILE = "project.zip"

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    ".vscode",
    "dist",
    "build",
    "coverage",
    ".next",
    "out",
    ".cache",
}

EXCLUDE_FILES = {
    ".env",
    "LICENSE",
    ".env.example",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".prettierrc",
    ".eslintrc.json",
    ".gitignore",
    "combined_output.txt",
    "script.js",
    "DFD.svg",
    "ERD.svg",
    OUTPUT_FILE,
}


def should_exclude_file(filename):
    return filename in EXCLUDE_FILES


def should_exclude_dir(dirname):
    return dirname in EXCLUDE_DIRS


def zip_project():
    root_dir = os.getcwd()
    output_path = os.path.join(root_dir, OUTPUT_FILE)

    # Remove old ZIP if it exists
    if os.path.exists(output_path):
        os.remove(output_path)

    with zipfile.ZipFile(
        output_path,
        "w",
        zipfile.ZIP_DEFLATED
    ) as zipf:

        for root, dirs, files in os.walk(root_dir):

            # Prevent os.walk from entering excluded directories
            dirs[:] = [
                d for d in dirs
                if not should_exclude_dir(d)
            ]

            for file in files:

                if should_exclude_file(file):
                    continue

                full_path = os.path.join(root, file)

                # Path inside the ZIP
                relative_path = os.path.relpath(
                    full_path,
                    root_dir
                )

                zipf.write(
                    full_path,
                    relative_path
                )

    print(f"Done! Project zipped to: {OUTPUT_FILE}")


if __name__ == "__main__":
    zip_project()