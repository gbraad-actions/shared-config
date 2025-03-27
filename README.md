Shared configuration action
===========================

Fetch configuration parameters from a shared .ini file and export as environment variables

```yaml
      - name: Fetch shared configuration
        uses: gbraad-action/shared-config@v1
        with:
          config_repo: https://github.com/gbraad/shared-config.git
          config_file: fedora.ini

      - name: Use base settings
        run: |
          echo "Using base version $BASE_VERSION"
          echo "Using base image $BASE_IMAGE"
        shell: bash

      - name: Use base settings 
        run: |
          echo "Using base version ${{ env.BASE_VERSION }}"
          echo "Using base image ${{ env.BASE_IMAGE }}"
```

```ini
[base]
VERSION=42
IMAGE=quay.io/fedora/fedora
```
