import md5 from 'md5';
import usetube from 'usetube';
import createDebugMessages from 'debug';

import { BaseLoader } from '../interfaces/base-loader.js';
import { YoutubeLoader } from './youtube-loader.js';

export class YoutubeChannelLoader extends BaseLoader<{ type: 'YoutubeChannelLoader' }> {
    private readonly debug = createDebugMessages('maap:loader:YoutubeChannelLoader');
    private readonly channelId: string;

    constructor({
        channelId,
        chunkSize,
        chunkOverlap,
    }: {
        channelId: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`YoutubeChannelLoader_${md5(channelId)}`, chunkSize ?? 2000, chunkOverlap);
        this.channelId = channelId;
    }

    override async *getUnfilteredChunks() {
        try {
            const videos = await usetube.getChannelVideos(this.channelId);
            this.debug(`Channel '${this.channelId}' returned ${videos.length} videos`);
            const videoIds = videos.map((v) => v.id);

            for (const videoId of videoIds) {
                const youtubeLoader = new YoutubeLoader({
                    videoIdOrUrl: videoId,
                    chunkSize: this.chunkSize,
                    chunkOverlap: this.chunkOverlap,
                });

                for await (const chunk of youtubeLoader.getUnfilteredChunks()) {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            type: <'YoutubeChannelLoader'>'YoutubeChannelLoader',
                            originalSource: this.channelId,
                        },
                    };
                }
            }
        } catch (e) {
            this.debug('Could not get videos for channel', this.channelId, e);
        }
    }
}
