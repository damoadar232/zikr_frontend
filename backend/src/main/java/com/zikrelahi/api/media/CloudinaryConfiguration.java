package com.zikrelahi.api.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties({ CloudinaryProperties.class, MediaUploadProperties.class })
public class CloudinaryConfiguration implements EnvironmentAware {

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Bean
    Cloudinary cloudinary(CloudinaryProperties properties) {
        if (environment.acceptsProfiles(Profiles.of("prod")) && !properties.isConfigured()) {
            throw new IllegalStateException(
                    "Cloudinary credentials are required in production. Configure CLOUDINARY_CLOUD_NAME, "
                            + "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
        }

        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", properties.getCloudName(),
                "api_key", properties.getApiKey(),
                "api_secret", properties.getApiSecret(),
                "secure", true));
    }
}
