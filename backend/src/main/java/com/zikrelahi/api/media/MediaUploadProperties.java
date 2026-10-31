package com.zikrelahi.api.media;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.media.upload")
public class MediaUploadProperties {

    private DataSize audioMaxFileSize = DataSize.ofMegabytes(100);
    private DataSize coverMaxFileSize = DataSize.ofMegabytes(10);
}
